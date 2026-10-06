/**
 * Foul-language detection & masking for grievance text.
 *
 * Workers may dictate a grievance using the voice-to-text feature and
 * occasionally use abusive language. The worker is never sent a notification,
 * but the case text is masked before it is shown to the contractor (and any
 * third party reading the case), while the composing worker sees a gentle
 * in-form highlight advising them not to use abusive language.
 *
 * Matching is case-insensitive and word-boundary based so names and regular
 * words (e.g. "Gandhi", "salaam") are never touched.
 */

const FOUL_WORDS = [
  // English
  'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'shitting', 'bitch', 'bastard',
  'asshole', 'dick', 'dickhead', 'cunt', 'motherfucker', 'piss', 'pissed',
  'slut', 'whore', 'damn', 'hell', 'arse', 'arsehole', 'idiot', 'stupid',
  'moron', 'retard', 'scum', 'wanker',
  // Hindi / Hinglish (transliterated)
  'madarchod', 'madar chod', 'behenchod', 'behen chod', 'bhenchod', 'bhenchod',
  'chutiya', 'chutia', 'chutiye', 'gaand', 'gand', 'lauda', 'laude', 'lund',
  'bhosdi', 'bhosdike', 'bhosda', 'kamina', 'harami', 'haraami', 'kutta',
  'kutiya', 'kutia', 'randi', 'chod', 'chud', 'suar', 'saala', 'sala',
  'khanki', 'bhen', 'teri maa ki', 'maa ki chut', 'bahan ki',
];

const FOUL_REGEX = new RegExp(
  `(?:${FOUL_WORDS.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'gi'
);

/** Returns true when the text contains any foul word. */
export function hasFoulLanguage(text: string): boolean {
  if (!text) return false;
  FOUL_REGEX.lastIndex = 0;
  return FOUL_REGEX.test(text);
}

/** Returns the text with every foul word masked (e.g. "fucking" → "*******"). */
export function maskFoulLanguage(text: string): string {
  if (!text) return text;
  return text.replace(FOUL_REGEX, match => '*'.repeat(match.length));
}
