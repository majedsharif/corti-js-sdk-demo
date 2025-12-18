import React from 'react';
import AmbientDocumentation from './components/AmbientDocumentation';
import styles from './App.module.css';

const App: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            Corti API JavaScript SDK Demo
          </h1>
          <p className={styles.subtitle}>
            Built using the Corti Web Socket API to demonstrate ambient scribe capabilities
          </p>

          {/* Tab Header */}
          <div className={styles.tabHeader}>
            <div>
              <span className={styles.tabTitle}>
                Ambient Scribe Documentation
              </span>
              <span className={styles.tabSubtitle}>
                AI-powered transcription, fact extraction, and document generation for healthcare
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <AmbientDocumentation />
        </div>
      </div>
    </div>
  );
};

export default App;