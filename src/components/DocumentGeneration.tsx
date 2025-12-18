import React, { useState } from 'react';
import { colors, buildUrl, DEFAULT_TEMPLATE, SUPPORTED_LANGUAGES } from '../constants';
import styles from './DocumentGeneration.module.css';

interface Fact {
  id: string;
  text: string;
  group: string;
  source?: string;
}

interface DocumentSection {
  key: string;
  name: string;
  text: string;
  sort: number;
}

interface GeneratedDocument {
  id: string;
  name: string;
  templateKey: string;
  sections: DocumentSection[];
  createdAt?: string;
  updatedAt?: string;
}

interface DocumentGenerationProps {
  interactionId: string | null;
  facts: Fact[];
  disabled?: boolean;
}

const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1');
};

const DocumentGeneration: React.FC<DocumentGenerationProps> = ({
  interactionId,
  facts,
  disabled = false
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [document, setDocument] = useState<GeneratedDocument | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');
  const [error, setError] = useState('');

  const generateDocument = async () => {
    if (!interactionId) {
      setError('No active session. Please start recording first.');
      return;
    }

    if (facts.length === 0) {
      setError('No facts available. Please record some audio first.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setDocument(null);

    try {
      const context = [{
        type: 'facts',
        data: facts.map(f => ({
          text: f.text,
          group: f.group || 'other',
          source: f.source || 'core'
        }))
      }];

      const response = await fetch(
        buildUrl(`/api/interactions/${interactionId}/documents`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            templateKey: DEFAULT_TEMPLATE.key,
            outputLanguage: selectedLanguage,
            name: `SOAP Note - ${new Date().toLocaleString()}`
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate document');
      }

      const doc = await response.json();
      setDocument(doc);
      setViewMode('formatted');
    } catch (err) {
      console.error('Document generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadJson = () => {
    if (!document) return;
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `document-${document.id || 'export'}.json`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canGenerate = interactionId && !disabled && !isGenerating && facts.length > 0;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Document Generation</h3>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlsGrid}>
          {/* Template Display */}
          <div>
            <label className={styles.label}>Template</label>
            <div className={styles.staticField}>
              {DEFAULT_TEMPLATE.name}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className={styles.label}>Output Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={disabled || isGenerating}
              className={styles.select}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <div>
            <label className={styles.label}>
              Source: Extracted Facts ({facts.length} {facts.length === 1 ? 'item' : 'items'})
            </label>
            <button
              onClick={generateDocument}
              disabled={!canGenerate}
              className={styles.generateButton}
              style={{ backgroundColor: canGenerate ? colors.black : colors.lunar }}
            >
              {isGenerating ? (
                <>
                  <span className={styles.buttonSpinner} />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {!interactionId && (
          <p className={styles.helperText}>
            Complete a recording session to enable document generation.
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>{error}</div>
      )}

      {/* Generated Document Display */}
      {document && (
        <div className={styles.documentContainer}>
          {/* Document Header */}
          <div className={styles.documentHeader}>
            <div>
              <h4 className={styles.documentTitle}>
                {document.name || 'Generated Document'}
              </h4>
              <span className={styles.documentMeta}>
                Template: {document.templateKey} • {document.sections?.length || 0} sections
              </span>
            </div>
            <div className={styles.documentActions}>
              {/* View Toggle */}
              <div className={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('formatted')}
                  className={viewMode === 'formatted' ? styles.toggleActive : styles.toggleInactive}
                >
                  Formatted
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={viewMode === 'json' ? styles.toggleActive : styles.toggleInactive}
                  style={{ borderLeft: `1px solid ${colors.lunar}` }}
                >
                  JSON
                </button>
              </div>
              {/* Download Button */}
              <button onClick={downloadJson} className={styles.downloadButton}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className={styles.documentContent}>
            {viewMode === 'formatted' ? (
              <div className={styles.sectionsContainer}>
                {(document.sections || [])
                  .sort((a, b) => (a.sort || 0) - (b.sort || 0))
                  .map((section, idx) => (
                    <div key={section.key || idx}>
                      <h5 className={styles.sectionTitle}>
                        {section.name || section.key}
                      </h5>
                      <div className={styles.sectionText}>
                        {section.text ? stripMarkdown(section.text) : (
                          <span className={styles.noContent}>No content</span>
                        )}
                      </div>
                    </div>
                  ))}
                {(!document.sections || document.sections.length === 0) && (
                  <div className={styles.emptyDocument}>
                    No sections in document
                  </div>
                )}
              </div>
            ) : (
              <pre className={styles.jsonView}>
                {JSON.stringify(document, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentGeneration;