import React from 'react';
import './Header.css';

export default function Header({ stats }) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo">&#129504;</span>
        <h1 className="header__title">Readapt</h1>
        <span className="header__tag">Adaptive Reading Assistant</span>
      </div>
      {stats && (
        <div className="header__stats">
          <div className="stat">
            <span className="stat__value">{stats.total}</span>
            <span className="stat__label">sentences</span>
          </div>
          <div className="stat stat--warning">
            <span className="stat__value">{stats.struggling}</span>
            <span className="stat__label">flagged</span>
          </div>
          <div className="stat stat--success">
            <span className="stat__value">{stats.simplified}</span>
            <span className="stat__label">simplified</span>
          </div>
        </div>
      )}
    </header>
  );
}
