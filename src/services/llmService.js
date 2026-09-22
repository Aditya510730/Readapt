/**
 * LLMService — interface for Person B's sentence simplification.
 *
 * ═══════════════════════════════════════════════════════════════
 *  PERSON B: This is your integration point!
 *
 *  Replace the `simplify()` function body with your actual
 *  HuggingFace Inasyncference API call or local model call.
 *
 *  Contract:
 *    Input:  a single sentence (string)
 *    Output: a simplified sentence (string), via Promise
 *    Time:   aim for < 2 seconds
 * ═══════════════════════════════════════════════════════════════
 *
 * For Week 1, the mock implementation below returns a
 * rule-based simplification so the UI can be tested.
 */

import bus from './eventBus.js';

const llmService = {
  /**
   * Simplify a sentence. Replace this with your real model call.
   * @param {string} sentence — the original sentence
   * @returns {Promise<string>} — the simplified version
   */
      async simplify(sentence) {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const response = await fetch(`${apiBase}/simplify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sentence }),
  });

  if (!response.ok) {
    throw new Error("Failed to simplify sentence");
  }

  const data = await response.json();

  return data.simplified;
},

  /**
   * Request simplification for a sentence index and broadcast result.
   * This is the main method the UI calls.
   */
  async requestSimplification(sentenceIndex, originalText) {
    bus.emit('llm:simplify', { sentenceIndex, original: originalText });

    try {
      const simplified = await this.simplify(originalText);
      bus.emit('llm:result', { sentenceIndex, simplified });
      return simplified;
    } catch (err) {
      bus.emit('llm:error', { sentenceIndex, error: err.message });
      throw err;
    }
  },
};

// ── Mock simplification rules ──
function mockSimplify(sentence) {
  let s = sentence;

  // Replace complex words with simpler ones
  const swaps = [
    [/\butilize\b/gi, 'use'],
    [/\bfacilitate\b/gi, 'help'],
    [/\bsubsequently\b/gi, 'then'],
    [/\bnevertheless\b/gi, 'still'],
    [/\bfurthermore\b/gi, 'also'],
    [/\bconsequently\b/gi, 'so'],
    [/\bapproximately\b/gi, 'about'],
    [/\bnumerous\b/gi, 'many'],
    [/\bdemonstrate\b/gi, 'show'],
    [/\bcomprehend\b/gi, 'understand'],
    [/\bacquire\b/gi, 'get'],
    [/\bphenomenon\b/gi, 'event'],
    [/\bindividuals\b/gi, 'people'],
    [/\bcommence\b/gi, 'start'],
    [/\bterminate\b/gi, 'end'],
    [/\bascertain\b/gi, 'find out'],
    [/\bin order to\b/gi, 'to'],
    [/\bdue to the fact that\b/gi, 'because'],
    [/\bat this point in time\b/gi, 'now'],
    [/\bin the event that\b/gi, 'if'],
    [/\bwith regard to\b/gi, 'about'],
    [/\bprior to\b/gi, 'before'],
    [/\bnotwithstanding\b/gi, 'despite'],
    [/\binasmuch as\b/gi, 'since'],
    [/\bpreclude\b/gi, 'prevent'],
    [/\bameliorate\b/gi, 'improve'],
    [/\bobfuscate\b/gi, 'confuse'],
    [/\belucidates\b/gi, 'explains'],
    [/\belucidating\b/gi, 'explaining'],
    [/\belucidate\b/gi, 'explain'],
    [/\bpropagation\b/gi, 'spread'],
    [/\bsynaptic\b/gi, 'nerve-connection'],
    [/\bneurotransmitters\b/gi, 'brain chemicals'],
    [/\bneuroplasticity\b/gi, 'brain flexibility'],
    [/\bcognitive\b/gi, 'thinking'],
    [/\bhippocampus\b/gi, 'memory center'],
    [/\bamygdala\b/gi, 'emotion center'],
    [/\bprefrontal cortex\b/gi, 'front brain area'],
    [/\bneurological\b/gi, 'brain-related'],
  ];

  swaps.forEach(([pattern, replacement]) => {
    s = s.replace(pattern, replacement);
  });

  // If no swaps happened, add a prefix to show it "worked"
  if (s === sentence) {
    // Split long sentences at conjunctions
    if (sentence.length > 100 && /,\s*(and|but|which|while|although)\b/.test(sentence)) {
      const parts = sentence.split(/,\s*(?:and|but|which|while|although)\s*/i);
      s = parts[0].trim().replace(/,\s*$/, '.') +
        ' ' + parts.slice(1).join('. ').trim();
      if (!s.endsWith('.')) s += '.';
    } else {
      s = 'Simply put: ' + sentence;
    }
  }

  return s;
}

export default llmService;
