import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header.jsx';
import Reader, { countSentences } from './components/Reader.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import TextInput from './components/TextInput.jsx';
import bus from './services/eventBus.js';
import { startGazeSocket } from './gazeSocketClient.js';
import './App.css';
import sampleTexts from './utils/sampleTexts.js';

const TEXT_OPTIONS = [
  { key: 'neuroscience', label: 'Neuroscience' },
  { key: 'technology', label: 'AI / Tech' },
  { key: 'simple', label: 'Simple' },
  { key: 'custom', label: 'Custom' },
];

export default function App() {
  const [currentTextKey, setCurrentTextKey] = useState('neuroscience');
  const [customText, setCustomText] = useState('');
  const [autoSimplify, setAutoSimplify] = useState(false);
  const [fontSize, setFontSize] = useState(19);
  const [stats, setStats] = useState({ total: 0, struggling: 0, simplified: 0 });

  const currentText = currentTextKey === 'custom'
    ? customText
    : sampleTexts[currentTextKey] || '';

  const totalSentences = useMemo(() => countSentences(currentText), [currentText]);

  // Track stats from events
  useEffect(() => {
    const struggling = new Set();
    const simplified = new Set();

    setStats({ total: totalSentences, struggling: 0, simplified: 0 });

    startGazeSocket();
    const u1 = bus.on('gaze:struggle', ({ sentenceIndex }) => {
      struggling.add(sentenceIndex);
      setStats((s) => ({ ...s, struggling: struggling.size }));
    });

    const u2 = bus.on('llm:result', ({ sentenceIndex }) => {
      struggling.delete(sentenceIndex);
      simplified.add(sentenceIndex);
      setStats((s) => ({
        ...s,
        struggling: struggling.size,
        simplified: simplified.size,
      }));
    });

    const u3 = bus.on('ui:reset', ({ sentenceIndex }) => {
      struggling.delete(sentenceIndex);
      simplified.delete(sentenceIndex);
      setStats((s) => ({
        ...s,
        struggling: struggling.size,
        simplified: simplified.size,
      }));
    });

    const u4 = bus.on('ui:resetAll', () => {
      struggling.clear();
      simplified.clear();
      setStats({ total: totalSentences, struggling: 0, simplified: 0 });
    });

    return () => { u1(); u2(); u3(); u4(); };
  }, [totalSentences]);

  const handleTextChange = (key) => {
    bus.emit('ui:resetAll', {});
    setCurrentTextKey(key);
  };

  const handleCustomText = (text) => {
    setCustomText(text);
    bus.emit('ui:resetAll', {});
    setCurrentTextKey('custom');
  };

  return (
    <div className="app">
      <Header stats={stats} />

      <main className="app__main">
        <TextInput onSubmit={handleCustomText} />

        {currentText ? (
          <Reader
            text={currentText}
            autoSimplify={autoSimplify}
            fontSize={fontSize}
          />
        ) : (
          <div className="app__empty">
            Select a sample text or paste your own to get started.
          </div>
        )}
      </main>

      <ControlPanel
        totalSentences={totalSentences}
        autoSimplify={autoSimplify}
        onToggleAutoSimplify={() => setAutoSimplify((v) => !v)}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onTextChange={handleTextChange}
        textOptions={TEXT_OPTIONS}
        currentTextKey={currentTextKey}
      />
    </div>
  );
}
