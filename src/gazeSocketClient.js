import gazeService from './services/gazeService.js';

const WS_URL = 'ws://localhost:8765';
const RECONNECT_DELAY_MS = 2000;

export function startGazeSocket() {
  let socket = null;
  let shouldReconnect = true;

  function connect() {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('[gazeSocketClient] Connected to Python gaze tracker');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'struggle') {
          const struggleType = data.subType === 'regression' ? 'regression' : 'fixation';
          gazeService.reportStruggle(data.sentenceIndex, struggleType, data.duration);
        } else if (data.type === 'reading') {
          gazeService.reportReading(data.sentenceIndex);
        }
      } catch (err) {
        console.error('[gazeSocketClient] Failed to parse message:', err);
      }
    };

    socket.onclose = () => {
      console.warn('[gazeSocketClient] Disconnected from gaze tracker');
      if (shouldReconnect) {
        setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    socket.onerror = (err) => {
      console.error('[gazeSocketClient] WebSocket error:', err);
    };
  }

  connect();

  return () => {
    shouldReconnect = false;
    if (socket) socket.close();
  };
}
