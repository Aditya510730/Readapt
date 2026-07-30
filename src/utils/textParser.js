/**
 * TextParser — splits text into sentences for the reader.
 *
 * Handles abbreviations (Dr., Mr., etc.) and decimal numbers
 * so they don't cause false sentence splits.
 */

// Common abbreviations that include periods
const ABBREVIATIONS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'st', 'ave',
  'dept', 'est', 'vol', 'vs', 'etc', 'approx', 'dept', 'div',
  'govt', 'inc', 'corp', 'ltd', 'co', 'no', 'fig', 'eq',
  'e.g', 'i.e', 'cf', 'al',
]);

/**
 * Split a block of text into an array of sentence strings.
 * Each sentence keeps its trailing punctuation.
 */
export function splitIntoSentences(text) {
  if (!text || !text.trim()) return [];

  const sentences = [];
  let current = '';

  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    current += chars[i];

    // Check for sentence-ending punctuation
    if (chars[i] === '.' || chars[i] === '!' || chars[i] === '?') {
      // Look at the word before the period to check for abbreviations
      if (chars[i] === '.') {
        const wordBefore = current.slice(0, -1).split(/\s+/).pop()?.toLowerCase() || '';
        if (ABBREVIATIONS.has(wordBefore) || ABBREVIATIONS.has(wordBefore.replace(/\./g, ''))) {
          continue; // abbreviation — don't split
        }
        // Check for decimal numbers (e.g., "3.14")
        if (/\d$/.test(current.slice(0, -1)) && i + 1 < chars.length && /\d/.test(chars[i + 1])) {
          continue;
        }
        // Check for ellipsis
        if (i + 1 < chars.length && chars[i + 1] === '.') {
          continue;
        }
      }

      // Check if next non-space char is uppercase or end of text (= real sentence boundary)
      const rest = text.slice(i + 1);
      const nextNonSpace = rest.match(/\S/);

      if (!nextNonSpace || /[A-Z"'“‘([]/.test(nextNonSpace[0])) {
        const trimmed = current.trim();
        if (trimmed) sentences.push(trimmed);
        current = '';
      }
    }
  }

  // Remaining text
  const trimmed = current.trim();
  if (trimmed) sentences.push(trimmed);

  return sentences;
}

/**
 * Split text into paragraphs, each containing an array of sentences.
 * Returns: [{ id: number, sentences: string[] }]
 */
export function splitIntoParagraphs(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((p, i) => ({
    id: i,
    sentences: splitIntoSentences(p),
  }));
}
