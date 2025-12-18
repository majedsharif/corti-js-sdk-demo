// Ambient Documentation Stream - Real-time Facts Extraction
// File: backend/ambientStream.js

import corti from './cortiClient.js';

export async function handleAmbientConnection(clientWs) {
  console.log('\n========================================');
  console.log('Ambient Documentation Client Connected');
  console.log('========================================');
  
  let streamSocket = null;
  let interactionId = null;
  let isConfigAccepted = false;
  let isStreamClosed = false;
  let audioQueue = [];
  let audioChunkCount = 0;
  let isClientConnected = true;

  // Helper to safely send to client
  const sendToClient = (data) => {
    if (isClientConnected && clientWs.readyState === 1) {
      try {
        clientWs.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Error sending to client:', e.message);
        return false;
      }
    }
    return false;
  };

  // Helper to safely close the stream
  const closeStream = () => {
    if (isStreamClosed || !streamSocket) {
      return;
    }
    
    try {
      if (typeof streamSocket.sendEnd === 'function') {
        streamSocket.sendEnd({ type: 'end' });
      } else if (typeof streamSocket.close === 'function') {
        streamSocket.close();
      }
    } catch (e) {
      // Only log if it's not the expected "socket not open" error
      if (!e.message?.includes('not open')) {
        console.error('Error closing stream:', e.message);
      }
    }
    
    isStreamClosed = true;
  };

  // Step 1: Create an interaction
  try {
    console.log('Creating interaction...');
    const interaction = await corti.interactions.create({
      encounter: {
        identifier: `ambient-${Date.now()}`,
        status: 'in-progress',
        type: 'consultation',
        title: 'Ambient Documentation Session'
      }
    });
    interactionId = interaction.interactionId;
    
    console.log('\nBEGIN AMBIENT DOCUMENTATION SESSION');
    console.log(`Interaction ID: ${interactionId}`);
    console.log(`Started: ${new Date().toISOString()}\n`);

    sendToClient({ type: 'session_started', interactionId });

  } catch (err) {
    console.error('Failed to create interaction:', err);
    sendToClient({ type: 'error', message: 'Failed to create interaction: ' + err.message });
    clientWs.close();
    return;
  }

  // Step 2: Connect to /stream with configuration
  try {
    console.log('Connecting to Corti /stream service...');
    
    const configuration = {
      transcription: {
        primaryLanguage: 'en',
        isDiarization: false,
        isMultichannel: false,
        participants: [{ channel: 0, role: 'multiple' }]
      },
      mode: {
        type: 'facts',
        outputLocale: 'en'
      }
    };

    console.log('Stream configuration:', JSON.stringify(configuration, null, 2));

    streamSocket = await corti.stream.connect({
      id: interactionId,
      configuration
    });

    console.log('✓ Stream socket created');

    // Subscribe to messages from Corti
    streamSocket.on('message', (message) => {
      console.log('Corti message:', message.type);
      handleCortiMessage(message, sendToClient, () => {
        isConfigAccepted = true;
        console.log(`Flushing ${audioQueue.length} queued audio chunks`);
        audioQueue.forEach(chunk => {
          try {
            streamSocket.sendAudio(chunk);
          } catch (e) {
            console.error('Error sending queued audio:', e.message);
          }
        });
        audioQueue = [];
      });
    });

    streamSocket.on('error', (error) => {
      console.error('Stream socket error:', error);
      sendToClient({ type: 'error', message: 'Stream error: ' + (error.message || JSON.stringify(error)) });
    });

    streamSocket.on('close', () => {
      console.log('Stream socket closed');
      isConfigAccepted = false;
      isStreamClosed = true;
    });

  } catch (err) {
    console.error('Failed to connect to /stream:', err);
    sendToClient({ type: 'error', message: 'Failed to connect to stream: ' + err.message });
    clientWs.close();
    return;
  }

  // Step 3: Handle messages from client
  clientWs.on('message', async (data) => {
    if (!streamSocket || isStreamClosed) {
      console.log('No active stream socket available');
      return;
    }

    const isJson = typeof data === 'string' || 
                   (Buffer.isBuffer(data) && data.length > 0 && data[0] === 123);

    if (isJson) {
      try {
        const msg = JSON.parse(data.toString());
        console.log('Client control message:', msg.type);
        
        switch (msg.type) {
          case 'flush':
            if (typeof streamSocket.sendFlush === 'function') {
              streamSocket.sendFlush({ type: 'flush' });
            }
            break;
          case 'end':
            console.log('Client requested end, sending to Corti stream...');
            console.log(`Total audio chunks sent before end: ${audioChunkCount}`);
            closeStream();
            break;
        }
      } catch {
        // Failed to parse as JSON, treat as audio
        sendAudioChunk(streamSocket, data, isConfigAccepted, audioQueue, () => audioChunkCount++);
      }
    } else {
      sendAudioChunk(streamSocket, data, isConfigAccepted, audioQueue, () => audioChunkCount++);
    }
  });

  // Step 4: Handle client disconnect
  clientWs.on('close', () => {
    console.log('\n========================================');
    console.log('Ambient Client Disconnected');
    console.log(`Interaction ID: ${interactionId}`);
    console.log(`Total audio chunks sent: ${audioChunkCount}`);
    console.log('========================================\n');
    
    isClientConnected = false;
    closeStream();
  });

  clientWs.on('error', (err) => {
    console.error('Client WebSocket error:', err);
    isClientConnected = false;
  });
}

function sendAudioChunk(socket, data, isReady, queue, onSent) {
  if (!isReady) {
    queue.push(data);
    if (queue.length % 10 === 0) {
      console.log(`Queued ${queue.length} audio chunks waiting for CONFIG_ACCEPTED`);
    }
    return;
  }
  
  try {
    socket.sendAudio(data);
    onSent();
  } catch (err) {
    console.error('Error sending audio:', err.message);
  }
}

function handleCortiMessage(msg, sendToClient, onConfigAccepted) {
  switch (msg.type) {
    case 'CONFIG_ACCEPTED':
      console.log('✓ Stream configuration accepted');
      sendToClient({ type: 'CONFIG_ACCEPTED' });
      onConfigAccepted();
      break;

    case 'CONFIG_DENIED':
    case 'CONFIG_MISSING':
    case 'CONFIG_NOT_PROVIDED':
    case 'CONFIG_ALREADY_RECEIVED':
    case 'CONFIG_TIMEOUT':
      console.error('Configuration error:', msg.type, msg.reason);
      sendToClient({ type: 'error', message: `${msg.type}: ${msg.reason || 'Unknown reason'}` });
      break;

    case 'transcript':
      console.log('\nTRANSCRIPT DATA:', JSON.stringify(msg, null, 2));
      
      if (msg.data && Array.isArray(msg.data)) {
        msg.data.forEach(segment => {
          console.log(`  Segment: "${segment.transcript}" (final: ${segment.final})`);
          sendToClient({
            type: 'transcript',
            data: {
              id: segment.id + '-' + (segment.time?.start || Math.random()),
              text: segment.transcript,
              isFinal: segment.final,
              speakerId: segment.speakerId,
              channel: segment.participant?.channel,
              start: segment.time?.start,
              end: segment.time?.end
            }
          });
        });
      }
      break;

    case 'facts':
      console.log('\nFACTS DATA:', JSON.stringify(msg, null, 2));
      
      const factsArray = msg.fact || msg.facts || msg.data;
      if (factsArray && Array.isArray(factsArray)) {
        const facts = factsArray.map(f => ({
          id: f.id,
          text: f.text,
          group: f.group,
          groupId: f.groupId,
          isDiscarded: f.isDiscarded,
          source: f.source,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt
        }));
        
        console.log(`Received ${facts.length} facts:`);
        facts.forEach(f => {
          console.log(`  [${f.group}] "${f.text}" (discarded: ${f.isDiscarded})`);
        });
        
        sendToClient({ type: 'facts', facts: facts });
      }
      break;

    case 'flushed':
      console.log('Audio buffer flushed');
      sendToClient({ type: 'flushed' });
      break;

    case 'usage':
      console.log('Usage credits:', msg.credits);
      sendToClient({ type: 'usage', credits: msg.credits });
      break;

    case 'ENDED':
      console.log('✓ Stream ended by Corti server');
      sendToClient({ type: 'ended' });
      break;

    case 'error':
      console.error('Stream error:', msg.error || msg);
      sendToClient({ type: 'error', message: msg.error?.details || msg.error?.title || 'Stream error' });
      break;

    default:
      console.log('Unhandled message type:', msg.type, msg);
  }
}