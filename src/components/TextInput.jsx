import React, { useState } from 'react';
import './TextInput.css';

/**
 * TextInput — lets users paste their own text to read.
 */
export default function TextInput({ onSubmit }) {
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="text-input-toggle" onClick={() => setIsOpen(true)}>
        + Paste your own text
      </button>
    );
  }

  return (
    <form className="text-input" onSubmit={handleSubmit}>
      <textarea
        className="text-input__area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste any text here to read it with adaptive simplification..."
        rows={6}
        autoFocus
      />
      <div className="text-input__actions">
        <button type="button" className="btn btn--dim" onClick={() => setIsOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn btn--accent" disabled={!text.trim()}>
          Load Text
        </button>
      </div>
    </form>
  );
}
