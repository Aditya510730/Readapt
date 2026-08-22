# ReAdapt

Real-time adaptive reading tool that detects reading struggles via webcam eye-tracking and automatically simplifies difficult sentences using an LLM.

## Quick Start (macOS + VSCode)

```bash
# 1. Open the project folder in VSCode
cd thinkneuro-reader

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The app opens at **http://localhost:3000**.

## Project Structure

```
thinkneuro-reader/
├── src/
│   ├── App.jsx                 # Main app — wires everything together
│   ├── components/
│   │   ├── Reader.jsx          # Reading pane (paragraphs → sentences)
│   │   ├── Sentence.jsx        # Single sentence — click/highlight/swap
│   │   ├── ControlPanel.jsx    # Debug controls + event log
│   │   ├── Header.jsx          # Top bar with live stats
│   │   └── TextInput.jsx       # Paste-your-own-text input
│   ├── services/
│   │   ├── eventBus.js         # Pub/sub for cross-module communication
│   │   ├── gazeService.js      # ★ Person A integration point
│   │   └── llmService.js       # ★ Person B integration point
│   └── utils/
│       ├── textParser.js       # Splits text into sentences
│       └── sampleTexts.js      # Demo passages
├── package.json
├── vite.config.js
└── index.html
```

## How It Works

### Sentence States

Each sentence cycles through four states:

1. **idle** (default) → normal text
2. **struggling** (yellow highlight) → gaze detected difficulty, or clicked manually
3. **simplifying** (pulsing purple) → LLM is processing
4. **simplified** (green highlight + "S" badge) → easier version shown

### Manual Testing (Week 1)

- **Click any sentence** → flags it as struggling (yellow)
- **Click a struggling sentence** → triggers simplification (green)
- **Click a simplified sentence** → reverts to original
- **Control Panel** (right sidebar) → simulate gaze events, run auto-demo

### Event System

All modules communicate through `eventBus.js`:

| Event | Payload | Meaning |
|---|---|---|
| `gaze:struggle` | `{ sentenceIndex, type, duration }` | User is struggling |
| `gaze:reading` | `{ sentenceIndex }` | User reading normally |
| `llm:simplify` | `{ sentenceIndex, original }` | Simplification requested |
| `llm:result` | `{ sentenceIndex, simplified }` | Simplified text ready |
| `llm:error` | `{ sentenceIndex, error }` | Simplification failed |
| `ui:reset` | `{ sentenceIndex }` | Revert one sentence |
| `ui:resetAll` | `{}` | Revert all sentences |

---

## Integration Guide

### Person A — Eye Tracking (MediaPipe)

Your module talks to the UI through `gazeService.js`. Two functions:

```js
import gazeService from './services/gazeService.js';

// When user stares at sentence #3 too long:
gazeService.reportStruggle(3, 'fixation', 4500);

// When user re-reads sentence #5:
gazeService.reportStruggle(5, 'regression');

// When user reads sentence #2 normally:
gazeService.reportReading(2);
```

**How to map gaze → sentence index:**
Every sentence in the DOM has a `data-sentence-index` attribute. Use `document.querySelectorAll('[data-sentence-index]')` to get their bounding rects, then match against the gaze coordinates from MediaPipe.

```js
function findSentenceAtPoint(x, y) {
  const sentences = document.querySelectorAll('[data-sentence-index]');
  for (const el of sentences) {
    const rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return Number(el.dataset.sentenceIndex);
    }
  }
  return -1;
}
```

### Person B — LLM Simplification

Your module plugs into `llmService.js`. Replace the `simplify()` function:

```js
// In src/services/llmService.js, replace the mock:

async simplify(sentence) {
  const response = await fetch('YOUR_HF_ENDPOINT', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
    },
    body: JSON.stringify({
      inputs: `Simplify this sentence: "${sentence}"`,
      parameters: { max_new_tokens: 100, temperature: 0.3 },
    }),
  });
  const data = await response.json();
  return data[0]?.generated_text || sentence;
}
```

The UI calls `llmService.requestSimplification(index, text)` which calls your `simplify()`, then broadcasts the result over the EventBus automatically.

---

## Week-by-Week Goals

### Week 1 — Build standalone pieces
- **Person C (you):** UI displays text, sentences are clickable and swappable ✅
- Manual controls simulate gaze + LLM without real backends ✅

### Week 2 — Connect two at a time
- **A + C:** Gaze detection triggers highlights in the UI
- **B + C:** Simplify button calls the real LLM, swaps text live

### Week 3 — Full integration
- Wire all three: gaze → LLM → UI update
- Prepare demo script with reliable test sentences

---

## Build for Production

```bash
npm run build    # outputs to dist/
npm run preview  # preview the build locally
```
