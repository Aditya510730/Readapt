import React, { useState, useMemo } from 'react';
import Sentence from './Sentence.jsx';
import { splitIntoParagraphs } from '../utils/textParser.js';
import bus from '../services/eventBus.js';
import './Reader.css';

/**
 * Reader — the main reading pane.
 * Displays text split into paragraphs → sentences, each interactive.
 */
export default function Reader({ text, autoSimplify, fontSize }) {
  const paragraphs = useMemo(() => splitIntoParagraphs(text), [text]);

  // Build a flat global index for each sentence across all paragraphs
  let globalIdx = 0;

  return (
    <article className="reader" style={{ fontSize: `${fontSize}px` }}>
      {paragraphs.map((para) => (
        <p key={para.id} className="reader__paragraph">
          {para.sentences.map((sentence, sIdx) => {
            const gi = globalIdx++;
            return (
              <React.Fragment key={gi}>
                <Sentence
                  text={sentence}
                  index={sIdx}
                  globalIndex={gi}
                  autoSimplify={autoSimplify}
                />
                {sIdx < para.sentences.length - 1 ? ' ' : ''}
              </React.Fragment>
            );
          })}
        </p>
      ))}
    </article>
  );
}

/**
 * Helper: count total sentences in a text block.
 * Exported so ControlPanel can use it for simulation.
 */
export function countSentences(text) {
  const paras = splitIntoParagraphs(text);
  return paras.reduce((sum, p) => sum + p.sentences.length, 0);
}
