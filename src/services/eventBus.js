/**
 * EventBus — lightweight pub/sub for cross-component communication.
 *
 * This is the central nervous system of the app. Person A's gaze module
 * emits events here, and the Reader UI listens for them.
 *
 * Events:
 *   'gaze:struggle'   — { sentenceIndex: number, type: 'fixation'|'regression', duration?: number }
 *   'gaze:reading'    — { sentenceIndex: number }  (user is reading normally)
 *   'llm:simplify'    — { sentenceIndex: number, original: string }  (request simplification)
 *   'llm:result'      — { sentenceIndex: number, simplified: string }  (simplified text ready)
 *   'llm:error'       — { sentenceIndex: number, error: string }
 *   'ui:reset'        — { sentenceIndex: number }  (revert to original)
 *   'ui:resetAll'     — {}
 */

class EventBus {
  constructor() {
    this._listeners = new Map();
    this._history = [];        // keep last 100 events for debugging
    this._debug = false;
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function (useful in useEffect cleanup)
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event.
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) set.delete(callback);
  }

  /**
   * Emit an event with data.
   */
  emit(event, data = {}) {
    const entry = { event, data, timestamp: Date.now() };

    // Debug logging
    if (this._debug) {
      console.log(`[EventBus] ${event}`, data);
    }

    // Keep history (ring buffer)
    this._history.push(entry);
    if (this._history.length > 100) this._history.shift();

    // Notify listeners
    const set = this._listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  /**
   * Subscribe to an event, but auto-unsubscribe after the first fire.
   */
  once(event, callback) {
    const unsub = this.on(event, (data) => {
      unsub();
      callback(data);
    });
    return unsub;
  }

  /**
   * Get recent event history (useful for debugging/demo panel).
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Clear all listeners (useful for teardown).
   */
  clear() {
    this._listeners.clear();
    this._history = [];
  }

  /**
   * Toggle debug logging.
   */
  setDebug(enabled) {
    this._debug = enabled;
  }
}

// Singleton instance — import this everywhere
const bus = new EventBus();
bus.setDebug(true); // turn on during development

export default bus;
