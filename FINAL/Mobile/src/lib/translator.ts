import type { Language } from '@/i18n';

/**
 * Client-side cache + transport for machine translation.
 *
 * Two engines, mirroring the admin setting:
 *  - "free": Google's unofficial endpoint, called directly from the browser
 *    (datacenter IPs are blocked, so the server can't do this reliably). The
 *    backend is used as a fallback.
 *  - "google_cloud": the official Google Cloud Translation API via the backend
 *    (reliable, billed), falling back to the browser free path.
 *
 * A per-browser cache (memory + localStorage) makes repeat renders instant.
 */

const STORAGE_PREFIX = 'bss-tr:';
const FREE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const CONCURRENCY = 4;

type TranslationMode = 'free' | 'google_cloud';
type TranslationConfig = { mode: TranslationMode; enabled: boolean };

const memory = new Map<string, string>();

function cacheKey(language: string, text: string): string {
  return `${language}:${text}`;
}

function readCache(language: string, text: string): string | undefined {
  const key = cacheKey(language, text);
  const hit = memory.get(key);
  if (hit !== undefined) return hit;
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (stored !== null) {
      memory.set(key, stored);
      return stored;
    }
  } catch {
    /* storage unavailable/blocked */
  }
  return undefined;
}

function writeCache(language: string, text: string, value: string): void {
  const key = cacheKey(language, text);
  memory.set(key, value);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    /* storage full/unavailable */
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

let configPromise: Promise<TranslationConfig> | null = null;

function getConfig(): Promise<TranslationConfig> {
  if (!configPromise) {
    configPromise = fetch('/api/translate', { cache: 'no-store' })
      .then(response => response.json())
      .then((payload: { data?: TranslationConfig }) => payload?.data ?? ({ mode: 'free', enabled: true } as TranslationConfig))
      .catch(() => ({ mode: 'free', enabled: true }) as TranslationConfig);
  }
  return configPromise;
}

async function freeTranslate(language: Language, text: string): Promise<string | null> {
  const url = `${FREE_ENDPOINT}?client=gtx&sl=en&tl=${encodeURIComponent(language)}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  const value = segments
    .map((segment: unknown) => (Array.isArray(segment) ? String(segment[0] ?? '') : ''))
    .join('')
    .trim();
  return value || null;
}

async function backendTranslate(language: Language, texts: string[]): Promise<string[]> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: language, source: 'en', texts }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: unknown };
    const data = Array.isArray(payload?.data) ? payload.data : [];
    return texts.map((text, index) => (typeof data[index] === 'string' && data[index] ? data[index] as string : text));
  } catch {
    return texts;
  }
}

/**
 * Translate a list of strings into `language`, preserving order. Cached values
 * are used first; remaining strings go to the configured engine, then to the
 * alternate engine. Unresolvable strings fall back to the source text.
 */
export async function translateBatch(language: Language, texts: string[]): Promise<string[]> {
  const results: string[] = new Array(texts.length);
  const misses: Array<{ index: number; text: string }> = [];

  texts.forEach((text, index) => {
    const cached = readCache(language, text);
    if (cached !== undefined) results[index] = cached;
    else misses.push({ index, text });
  });

  if (!misses.length) return results;

  const config = await getConfig();
  if (!config.enabled) {
    misses.forEach(item => { results[item.index] = item.text; });
    return results;
  }

  const record = (item: { index: number; text: string }, value: string | null) => {
    if (value && value !== item.text) {
      results[item.index] = value;
      writeCache(language, item.text, value);
      return true;
    }
    return false;
  };

  let leftover = misses;

  const runFree = async (items: Array<{ index: number; text: string }>) => {
    const free = await mapLimit(items, CONCURRENCY, item => freeTranslate(language, item.text));
    const unresolved: Array<{ index: number; text: string }> = [];
    items.forEach((item, position) => { if (!record(item, free[position])) unresolved.push(item); });
    return unresolved;
  };

  const runBackend = async (items: Array<{ index: number; text: string }>) => {
    const backend = await backendTranslate(language, items.map(item => item.text));
    const unresolved: Array<{ index: number; text: string }> = [];
    items.forEach((item, position) => { if (!record(item, backend[position])) unresolved.push(item); });
    return unresolved;
  };

  if (config.mode === 'google_cloud') {
    leftover = await runBackend(leftover);
    if (leftover.length) leftover = await runFree(leftover);
  } else {
    leftover = await runFree(leftover);
    if (leftover.length) leftover = await runBackend(leftover);
  }

  leftover.forEach(item => { results[item.index] = item.text; });
  return results;
}
