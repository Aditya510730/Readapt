import React, { useState, useEffect, useRef } from 'react';
import bus from '../services/eventBus.js';
import gazeService from '../services/gazeService.js';
import './ControlPanel.css';

/**
 * ControlPanel — debug & demo controls.
 * Allows manual triggering of gaze events, adjusting settings,
 * and viewing the event log. Used during Week 1 standalone testing.
 */
export default function ControlPanel({
  totalSentences,
  autoSimplify,
  onToggleAutoSimplify,
  fontSize,
  onFontSizeChange,
  onTextChange,
  textOptions,
  currentTextKey,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [eventLog, setEventLog] = useState([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [autoSimRunning, setAutoSimRunning] = useState(false);
  const stopSimRef = useRef(null);

  // Listen to all events for the log
  useEffect(() => {
    const events = ['gaze:struggle', 'gaze:reading', 'llm:simplify', 'llm:result', 'llm:error', 'ui:reset', 'ui:resetAll'];
    const unsubs = events.map((evt) =>
      bus.on(evt, (data) => {
        setEventLog((prev) => [
          { event: evt, data, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 49),
        ]);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const handleSimulateStruggle = () => {
    gazeService.reportStruggle(targetIndex, 'fixation', 3000);
  };

  const handleSimulateRandom = () => {
    const idx = gazeService.simulateStruggle(totalSentences);
    setTargetIndex(idx);
  };

  const handleResetAll = () => {
    bus.emit('ui:resetAll', {});
  };

  const handleResetOne = () => {
    bus.emit('ui:reset', { sentenceIndex: targetIndex });
  };

  const toggleAutoSim = () => {
    if (autoSimRunning) {
      stopSimRef.current?.();
      stopSimRef.current = null;
      setAutoSimRunning(false);
    } else {
      stopSimRef.current = gazeService.startAutoSimulation(totalSentences, 4000);
      setAutoSimRunning(true);
    }
  };

  // Cleanup auto-sim on unmount
  useEffect(() => {
    return () => stopSimRef.current?.();
  }, []);

  if (!isOpen) {
    return (
      <button className="control-toggle" onClick={() => setIsOpen(true)} title="Open control panel">
        <span className="control-toggle__icon">&#9881;</span>
      </button>
    );
  }

  return (
    <aside className="control-panel">
      <div className="control-panel__header">
        <h3>Control Panel</h3>
        <button className="control-panel__close" onClick={() => setIsOpen(false)}>
          &times;
        </button>
      </div>

      {/* Text Selection */}
      <section className="control-section">
        <h4>Sample Text</h4>
        <div className="control-row">
          {textOptions.map((opt) => (
            <button
              key={opt.key}
              className={`btn btn--small ${currentTextKey === opt.key ? 'btn--active' : ''}`}
              onClick={() => onTextChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Reading Settings */}
      <section className="control-section">
        <h4>Settings</h4>
        <div className="control-row">
          <label className="control-label">
            Font size: {fontSize}px
            <input
              type="range"
              min="14"
              max="28"
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="control-slider"
            />
          </label>
        </div>
        <div className="control-row">
          <label className="control-label control-label--toggle">
            <input
              type="checkbox"
              checked={autoSimplify}
              onChange={onToggleAutoSimplify}
            />
            Auto-simplify on struggle
          </label>
        </div>
      </section>

      {/* Gaze Simulation */}
      <section className="control-section">
        <h4>Simulate Gaze</h4>
        <div className="control-row">
          <label className="control-label">
            Target sentence: {targetIndex}
            <input
              type="range"
              min="0"
              max={Math.max(0, totalSentences - 1)}
              value={targetIndex}
              onChange={(e) => setTargetIndex(Number(e.target.value))}
              className="control-slider"
            />
          </label>
        </div>
        <div className="control-row control-row--buttons">
          <button className="btn btn--warning" onClick={handleSimulateStruggle}>
            Flag #{targetIndex}
          </button>
          <button className="btn btn--accent" onClick={handleSimulateRandom}>
            Random
          </button>
          <button
            className={`btn ${autoSimRunning ? 'btn--danger' : 'btn--success'}`}
            onClick={toggleAutoSim}
          >
            {autoSimRunning ? 'Stop Auto' : 'Auto Demo'}
          </button>
        </div>
        <div className="control-row control-row--buttons">
          <button className="btn btn--dim" onClick={handleResetOne}>
            Reset #{targetIndex}
          </button>
          <button className="btn btn--dim" onClick={handleResetAll}>
            Reset All
          </button>
        </div>
      </section>

      {/* Event Log */}
      <section className="control-section">
        <h4>Event Log ({eventLog.length})</h4>
        <div className="event-log">
          {eventLog.length === 0 ? (
            <p className="event-log__empty">No events yet. Click a sentence or use the buttons above.</p>
          ) : (
            eventLog.map((entry, i) => (
              <div key={i} className={`event-log__entry event-log__entry--${entry.event.split(':')[0]}`}>
                <span className="event-log__time">{entry.time}</span>
                <span className="event-log__event">{entry.event}</span>
                <span className="event-log__data">
                  {entry.data.sentenceIndex !== undefined && `#${entry.data.sentenceIndex}`}
                  {entry.data.type && ` (${entry.data.type})`}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Instructions */}
      <section className="control-section">
        <h4>How to use</h4>
        <ul className="control-instructions">
          <li><strong>Click any sentence</strong> to flag it as difficult (yellow)</li>
          <li><strong>Click a flagged sentence</strong> to simplify it (green)</li>
          <li><strong>Click a simplified sentence</strong> to revert it</li>
          <li>Use the <strong>simulate buttons</strong> above to mimic eye-tracking triggers</li>
        </ul>
      </section>
    </aside>
  );
}
