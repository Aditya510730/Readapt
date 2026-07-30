import React, { useState, useEffect, useRef } from 'react';
import bus from '../services/eventBus.js';
import llmService from '../services/llmService.js';
import './Sentence.css';

/**
 * Sentence — renders a single sentence with struggle detection + simplification.
 *
 * States:
 *   'idle'        — normal reading
 *   'struggling'  — gaze detected struggle (highlighted)
 *   'simplifying' — LLM is working on it (loading animation)
 *   'simplified'  — simplified text shown (green, with revert option)
 */
export default function Sentence({ text, index, globalIndex, autoSimplify }) {
  const [state, setState] = useState('idle');        // idle | struggling | simplifying | simplified
  const [displayText, setDisplayText] = useState(text);
  const [originalText] = useState(text);
  const [struggleInfo, setStruggleInfo] = useState(null);
  const ref = useRef(null);

  // Listen for gaze:struggle events targeting this sentence
  useEffect(() => {
    const unsub = bus.on('gaze:struggle', (data) => {
      if (data.sentenceIndex === globalIndex && state !== 'simplified') {
        setState('struggling');
        setStruggleInfo(data);

        // Auto-simplify if enabled
        if (autoSimplify) {
          handleSimplify();
        }
      }
    });
    return unsub;
  }, [globalIndex, state, autoSimplify]);

  // Listen for reset events
  useEffect(() => {
    const unsub1 = bus.on('ui:reset', (data) => {
      if (data.sentenceIndex === globalIndex) {
        handleRevert();
      }
    });
    const unsub2 = bus.on('ui:resetAll', () => {
      handleRevert();
    });
    return () => { unsub1(); unsub2(); };
  }, [globalIndex, originalText]);

  const handleSimplify = async () => {
    if (state === 'simplifying') return;
    setState('simplifying');
    try {
      const simplified = await llmService.requestSimplification(globalIndex, originalText);
      setDisplayText(simplified);
      setState('simplified');
    } catch {
      setState('struggling');
    }
  };

  const handleRevert = () => {
    setDisplayText(originalText);
    setState('idle');
    setStruggleInfo(null);
  };

  const handleClick = () => {
    if (state === 'idle') {
      // Manual trigger: simulate a struggle
      setState('struggling');
      setStruggleInfo({ type: 'manual', duration: 0 });
    } else if (state === 'struggling') {
      handleSimplify();
    } else if (state === 'simplified') {
      handleRevert();
    }
  };

  // Expose sentence position for Person A's gaze mapping
  useEffect(() => {
    if (ref.current) {
      ref.current.dataset.sentenceIndex = globalIndex;
    }
  }, [globalIndex]);

  const stateClass = `sentence sentence--${state}`;
  const isSimplified = state === 'simplified';

  return (
    <span
      ref={ref}
      className={stateClass}
      onClick={handleClick}
      data-sentence-index={globalIndex}
      title={
        state === 'idle'
          ? 'Click to flag as difficult'
          : state === 'struggling'
          ? 'Click to simplify'
          : state === 'simplifying'
          ? 'Simplifying...'
          : 'Click to revert to original'
      }
    >
      {state === 'simplifying' ? (
        <span className="sentence__loading">
          <span className="sentence__loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
          {displayText}
        </span>
      ) : (
        <>
          {displayText}
          {isSimplified && (
            <span className="sentence__badge" title="Simplified — click to revert">
              S
            </span>
          )}
          {state === 'struggling' && (
            <span className="sentence__badge sentence__badge--struggle" title="Struggling detected — click to simplify">
              !
            </span>
          )}
        </>
      )}
    </span>
  );
}
