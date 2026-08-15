"""
Milestone 2/3 v3: Gaze/head-tilt tracking with CALIBRATION for accurate
line detection.

Install (inside your venv):
    pip install mediapipe opencv-python numpy websockets

Run:
    python gaze_tracker_calibrated.py
"""

import asyncio
import json
import time
import cv2
import mediapipe as mp
import numpy as np
import websockets

# ── Config ───────────────────────────────────────────────────────────
NUM_LINES = 3
DWELL_STRUGGLE_SEC = 3.0
REVISIT_STRUGGLE_COUNT = 3
STABLE_HOLD_SEC = 0.5
SMOOTHING_WINDOW = 6
WS_PORT = 8765

NOSE_TIP = 1

mp_face_mesh = mp.solutions.face_mesh


class GazeState:
    def __init__(self, num_lines):
        self.num_lines = num_lines
        self.current_line = None
        self.line_enter_time = None
        self.revisit_counts = {i: 0 for i in range(num_lines)}
        self.max_line_seen = -1
        self.last_event_line = None
        self.last_event_type = None
        self.pending_line = None
        self.pending_since = None

    def update(self, line_idx):
        now = time.time()

        if self.current_line is None:
            self.current_line = line_idx
            self.line_enter_time = now
            self.max_line_seen = line_idx
            return None

        if line_idx != self.current_line:
            if self.pending_line != line_idx:
                self.pending_line = line_idx
                self.pending_since = now
                return None

            if now - self.pending_since < STABLE_HOLD_SEC:
                return None

            if line_idx < self.max_line_seen:
                self.revisit_counts[line_idx] += 1

            self.current_line = line_idx
            self.line_enter_time = now
            self.max_line_seen = max(self.max_line_seen, line_idx)
            self.pending_line = None
            self.pending_since = None

            if self.revisit_counts[line_idx] >= REVISIT_STRUGGLE_COUNT:
                return self._emit("struggle", line_idx, "regression", 0)
            return self._emit("reading", line_idx, None, 0)

        self.pending_line = None
        self.pending_since = None

        dwell = now - self.line_enter_time
        if dwell >= DWELL_STRUGGLE_SEC:
            return self._emit("struggle", line_idx, "fixation", int(dwell * 1000))

        return None

    def _emit(self, event_type, line_idx, sub_type, duration_ms):
        if (event_type, line_idx) == (self.last_event_type, self.last_event_line):
            return None
        self.last_event_type = event_type
        self.last_event_line = line_idx
        return event_type, line_idx, sub_type, duration_ms


def get_nose_y(landmarks, h):
    return landmarks[NOSE_TIP].y * h


def run_calibration(cap, face_mesh):
    top_y = None
    bottom_y = None

    print("\n=== CALIBRATION ===")
    print("Tilt your head up to look at the TOP of the text, then press 't'")
    print("Tilt your head down to look at the BOTTOM of the text, then press 'b'")
    print("Press 'c' to confirm and start tracking once both are set.\n")

    while True:
        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        current_nose_y = None
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark
            current_nose_y = get_nose_y(landmarks, h)
            nose_pt = landmarks[NOSE_TIP]
            cv2.circle(frame, (int(nose_pt.x * w), int(nose_pt.y * h)), 5, (0, 255, 255), -1)

        status_lines = [
            f"TOP set: {'YES (' + str(int(top_y)) + ')' if top_y is not None else 'no'}  (press t)",
            f"BOTTOM set: {'YES (' + str(int(bottom_y)) + ')' if bottom_y is not None else 'no'}  (press b)",
            "Press 'c' to confirm and start" if (top_y is not None and bottom_y is not None) else "",
        ]
        for idx, line in enumerate(status_lines):
            cv2.putText(frame, line, (20, 40 + idx * 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.imshow("Calibration - press q to quit", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('t') and current_nose_y is not None:
            top_y = current_nose_y
            print(f"TOP recorded: {top_y:.1f}")
        elif key == ord('b') and current_nose_y is not None:
            bottom_y = current_nose_y
            print(f"BOTTOM recorded: {bottom_y:.1f}")
        elif key == ord('c') and top_y is not None and bottom_y is not None:
            gap = abs(bottom_y - top_y)
            print(f"Calibration confirmed (range: {gap:.1f}px). Starting tracking...\n")
            return top_y, bottom_y
        elif key == ord('q'):
            return None, None


async def gaze_loop(websocket_holder):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: could not open webcam. Try changing VideoCapture(0) to (1).")
        return

    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.75)
    print("Warming up camera...")
    for _ in range(30):
        cap.read()

    with mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh:

        top_y, bottom_y = run_calibration(cap, face_mesh)
        if top_y is None:
            print("Calibration cancelled.")
            cap.release()
            cv2.destroyAllWindows()
            return

        cv2.destroyWindow("Calibration - press q to quit")

        state = GazeState(NUM_LINES)
        ratio_history = []

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                await asyncio.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            h, w, _ = frame.shape
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark

                nose_pt = landmarks[NOSE_TIP]
                cv2.circle(frame, (int(nose_pt.x * w), int(nose_pt.y * h)), 5, (0, 255, 255), -1)

                nose_y = get_nose_y(landmarks, h)
                raw_ratio = (nose_y - top_y) / (bottom_y - top_y + 1e-6)
                raw_ratio = np.clip(raw_ratio, 0.0, 1.0)

                ratio_history.append(raw_ratio)
                if len(ratio_history) > SMOOTHING_WINDOW:
                    ratio_history.pop(0)
                ratio = sum(ratio_history) / len(ratio_history)

                line_idx = min(int(ratio * NUM_LINES), NUM_LINES - 1)

                cv2.putText(
                    frame, f"Line: {line_idx}  (ratio {ratio:.2f})", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2
                )

                result = state.update(line_idx)
                if result:
                    event_type, idx, sub_type, duration_ms = result
                    payload = {
                        "type": event_type,
                        "sentenceIndex": idx,
                        "subType": sub_type,
                        "duration": duration_ms,
                    }
                    ws = websocket_holder.get("ws")
                    if ws is not None:
                        try:
                            await ws.send(json.dumps(payload))
                            print("Sent:", payload)
                        except Exception as e:
                            print("WebSocket send failed:", e)
                    else:
                        print("(no client connected) would send:", payload)

            cv2.imshow("Gaze Tracker - press q to quit", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            await asyncio.sleep(0.01)

    cap.release()
    cv2.destroyAllWindows()


async def main():
    websocket_holder = {"ws": None}

    async def handler(ws):
        print("React app connected via WebSocket")
        websocket_holder["ws"] = ws
        try:
            async for _ in ws:
                pass
        finally:
            print("React app disconnected")
            websocket_holder["ws"] = None

    server = await websockets.serve(handler, "localhost", WS_PORT)
    print(f"WebSocket server running on ws://localhost:{WS_PORT}")

    await gaze_loop(websocket_holder)

    server.close()
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())