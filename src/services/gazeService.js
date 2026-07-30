/**
 * GazeService — interface for Person A's eye-tracking module.
 *
 * ═══════════════════════════════════════════════════════════════
 *  PERSON A: This is your integration point!
 *
 *  Your MediaPipe gaze detection should call:
 *    gazeService.reportStruggle(sentenceIndex, type, duration)
 *    gazeService.reportReading(sentenceIndex)
 *
 *  The UI will react automatically via the EventBus.
 * ═══════════════════════════════════════════════════════════════
 *
 * For Week 1 (standalone), the mock functions below simulate
 * gaze events so the UI can be tested independently.
 */

import bus from './eventBus.js';

const gazeService = {
  /**
   * Call this when the user is struggling with a sentence.
   * @param {number} sentenceIndex — which sentence (0-based)
   * @param {'fixation'|'regression'} type — fixation = long stare, regression = re-reading
   * @param {number} [duration] — how long they stared (ms), optional
   */
  reportStruggle(sentenceIndex, type = 'fixation', duration = 3000) {
    bus.emit('gaze:struggle', { sentenceIndex, type, duration });
  },

  /**
   * Call this when the user is reading a sentence normally.
   * @param {number} sentenceIndex
   */
  reportReading(sentenceIndex) {
    bus.emit('gaze:reading', { sentenceIndex });
  },

  // ── Mock / Simulation (remove when real tracking is connected) ──

  /**
   * Simulate a random struggle event (for testing).
   * @param {number} totalSentences — how many sentences are on screen
   */
  simulateStruggle(totalSentences) {
    const idx = Math.floor(Math.random() * totalSentences);
    const type = Math.random() > 0.5 ? 'fixation' : 'regression';
    const duration = 2000 + Math.floor(Math.random() * 4000);
    this.reportStruggle(idx, type, duration);
    return idx;
  },

  /**
   * Start an auto-simulation loop (for demo mode).
   * Fires a random struggle every `intervalMs`.
   * @returns {Function} stop function
   */
  startAutoSimulation(totalSentences, intervalMs = 5000) {
    const id = setInterval(() => {
      this.simulateStruggle(totalSentences);
    }, intervalMs);
    return () => clearInterval(id);
  },
};

export default gazeService;
