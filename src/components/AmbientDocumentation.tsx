import React, { useState, useRef, useEffect } from 'react';
import DocumentGeneration from './DocumentGeneration';
import { colors, factGroups, buildWsUrl, api } from '../constants';
import styles from './AmbientDocumentation.module.css';

interface TranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;
  speakerId?: number;
  channel?: number;
  start?: number;
  end?: number;
}

interface Fact {
  id: string;
  text: string;
  group: string;
  groupId?: string;
  isDiscarded?: boolean;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

const AmbientDocumentation: React.FC = () => {
  const [status, setStatus] = useState<Status>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasRecordedOnce, setHasRecordedOnce] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [segments, interimText]);

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const startStreaming = async () => {
    setError('');
    setStatus('connecting');
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const ws = new WebSocket(buildWsUrl(api.ws.ambient));
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Ambient WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWebSocketMessage(msg);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('Connection error. Make sure the backend is running.');
        setStatus('error');
        stopStreaming();
      };

      ws.onclose = (e) => {
        console.log('WebSocket closed:', e.code, e.reason);
        if (isStreaming) {
          setStatus('disconnected');
          stopStreaming();
        }
      };

    } catch (err) {
      console.error('Failed to start streaming:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setStatus('error');
    }
  };

  const handleWebSocketMessage = (msg: Record<string, unknown>) => {
    console.log('WS Message:', msg.type, msg);

    switch (msg.type) {
      case 'session_started':
        setInteractionId(msg.interactionId as string);
        break;

      case 'CONFIG_ACCEPTED':
        console.log('Config accepted, starting audio capture...');
        setStatus('connected');
        setIsStreaming(true);
        setHasRecordedOnce(true);
        startAudioCapture();
        startTimer();
        updateAudioLevel();
        break;

      case 'CONFIG_DENIED':
        setError(`Configuration denied: ${(msg.reason as string) || 'Unknown reason'}`);
        setStatus('error');
        break;

      case 'transcript':
        if (msg.data) {
          const data = msg.data as TranscriptSegment;
          if (data.isFinal) {
            setSegments(prev => {
              const exists = prev.some(s => s.id === data.id);
              if (exists) {
                return prev.map(s => s.id === data.id ? { ...s, ...data } : s);
              }
              return [...prev, data];
            });
            setInterimText('');
          } else {
            setInterimText(data.text || '');
          }
        }
        break;

      case 'facts':
        if (msg.facts && Array.isArray(msg.facts)) {
          setFacts(prev => {
            const factMap = new Map(prev.map(f => [f.id, f]));
            (msg.facts as Fact[]).forEach((newFact: Fact) => {
              if (!newFact.isDiscarded) {
                factMap.set(newFact.id, newFact);
              } else {
                factMap.delete(newFact.id);
              }
            });
            return Array.from(factMap.values());
          });
        }
        break;

      case 'usage':
        setCredits(prev => (prev || 0) + (msg.credits as number));
        break;

      case 'error':
        setError((msg.message as string) || 'Stream error occurred');
        break;

      case 'ended':
        console.log('Stream ended, closing connection');
        setIsStreaming(false);
        setIsEnding(false);
        setStatus('disconnected');
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        break;
    }
  };

  const startAudioCapture = () => {
    if (!streamRef.current || !wsRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm;codecs=opus'
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        const arrayBuffer = await event.data.arrayBuffer();
        wsRef.current.send(arrayBuffer);
      }
    };

    mediaRecorder.start(500);
  };

  const startTimer = () => {
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current || !isStreaming) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(average / 128, 1));
    
    requestAnimationFrame(updateAudioLevel);
  };

  const stopStreaming = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsEnding(true);
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    } else {
      setIsStreaming(false);
      setStatus('disconnected');
    }

    setAudioLevel(0);
    analyserRef.current = null;
  };

  const reset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setSegments([]);
    setInterimText('');
    setFacts([]);
    setError('');
    setDuration(0);
    setStatus('disconnected');
    setInteractionId(null);
    setCredits(null);
    setIsStreaming(false);
    setIsEnding(false);
    setHasRecordedOnce(false);
    setAudioLevel(0);
    analyserRef.current = null;
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const groupedFacts = facts.reduce((acc, fact) => {
    const group = fact.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(fact);
    return acc;
  }, {} as Record<string, Fact[]>);

  const getGroupStyle = (group: string) => {
    return factGroups[group] || { label: group, color: '#6B7280', bg: '#F9FAFB' };
  };

  const renderEmptyState = (type: 'transcript' | 'facts') => {
    if (isStreaming) {
      return type === 'transcript' ? 'Transcribing...' : 'Extracting clinical facts...';
    }
    if (isEnding) {
      return 'Processing...';
    }
    if (hasRecordedOnce) {
      return (
        <div>
          <div style={{ marginBottom: 4 }}>
            No {type === 'transcript' ? 'transcript captured' : 'facts extracted'}...
          </div>
          <div style={{ fontSize: 12, color: colors.lunar }}>
            Click record to try again.
          </div>
        </div>
      );
    }
    return type === 'transcript' 
      ? 'Click record to start transcribing...' 
      : 'Click record to start extracting facts...';
  };

  return (
    <div>
      {/* Stream Control */}
      <div className={styles.controlPanel}>
        <div className={styles.controlContent}>
          {/* Streaming Button */}
          <div style={{ position: 'relative' }}>
            {isStreaming && !isEnding && (
              <div 
                className={styles.audioRing}
                style={{
                  opacity: 0.3 + audioLevel * 0.7,
                  transform: `scale(${1 + audioLevel * 0.2})`,
                }}
              />
            )}
            <button
              onClick={isStreaming ? stopStreaming : startStreaming}
              disabled={status === 'connecting' || isEnding}
              className={styles.recordButton}
              style={{
                backgroundColor: isEnding ? colors.asteroid : (isStreaming ? colors.recording : colors.black),
                opacity: (status === 'connecting' || isEnding) ? 0.5 : 1,
              }}
            >
              {isEnding ? (
                <div className={styles.spinner} />
              ) : isStreaming ? (
                <div className={styles.stopIcon} />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z" fill={colors.white} />
                  <path d="M5 10V12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12V10" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 19V22M12 22H9M12 22H15" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>

          {/* Status */}
          <div className={styles.statusText}>
            {status === 'connecting' ? (
              <span>Connecting...</span>
            ) : isEnding ? (
              <div className={styles.statusWithIcon}>
                <div className={styles.spinnerSmall} />
                <span>Processing final results...</span>
              </div>
            ) : isStreaming ? (
              <div className={styles.statusWithIcon}>
                <div className={styles.recordingDot} />
                <span>Recording • {formatTime(duration)}</span>
              </div>
            ) : (
              <span>Record</span>
            )}
          </div>

          {interactionId && (
            <div className={styles.sessionId}>
              Session Interaction ID: {interactionId}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Two-Column Layout */}
      <div className={styles.columnsContainer}>
        {/* Transcript Column */}
        <div>
          <h3 className={styles.columnHeader}>Transcript</h3>
          <div className={styles.columnContent}>
            {segments.length === 0 && !interimText ? (
              <div className={styles.emptyState}>
                {renderEmptyState('transcript')}
              </div>
            ) : (
              <div className={styles.transcriptText}>
                {segments.map((seg) => (
                  <span key={seg.id}>{seg.text} </span>
                ))}
                {interimText && (
                  <span className={styles.interimText}>{interimText}</span>
                )}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Facts Column */}
        <div>
          <h3 className={styles.columnHeader}>
            Extracted Facts (FactsR™)
            <span className={styles.factCount}>
              {' '}•{' '}{facts.length} {facts.length === 1 ? 'item' : 'items'}
            </span>
          </h3>
          <div className={styles.columnContent}>
            {Object.keys(groupedFacts).length === 0 ? (
              <div className={styles.emptyState}>
                {renderEmptyState('facts')}
              </div>
            ) : (
              <div className={styles.factsContainer}>
                {Object.entries(groupedFacts).map(([group, groupFacts]) => {
                  const style = getGroupStyle(group);
                  return (
                    <div key={group}>
                      <div 
                        className={styles.factGroupLabel}
                        style={{ color: style.color }}
                      >
                        {style.label}
                      </div>
                      <div className={styles.factsList}>
                        {groupFacts.map((fact) => (
                          <div
                            key={fact.id}
                            className={styles.factItem}
                            style={{
                              backgroundColor: style.bg,
                              borderColor: `${style.color}20`,
                            }}
                          >
                            {fact.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentGeneration
        interactionId={interactionId}
        facts={facts}
        disabled={isStreaming}
      />

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.credits}>
          {credits !== null && `Corti credits consumed: $${credits.toFixed(6)} (USD)`}
        </div>
        <button
          onClick={reset}
          disabled={isStreaming}
          className={styles.resetButton}
          style={{ opacity: isStreaming ? 0.5 : 1 }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default AmbientDocumentation;