"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { dictionaryValuesFor, type Language } from '@/i18n';
import { translateBatch } from '@/lib/translator';

/**
 * Runtime machine translation for pages that are not (yet) fully covered by the
 * curated dictionaries.
 *
 * When a non-English language is active it walks the rendered DOM, sends the
 * English strings to the backend translator (cached) and swaps them in place.
 * Curated dictionary values are never re-translated. Switching back to English
 * restores the original text. A MutationObserver picks up content rendered
 * after navigation/state changes.
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'KBD', 'SAMP', 'CANVAS', 'SVG', 'MATH', 'TIME']);
const TRANSLATE_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'] as const;

// Exact strings that must stay as-is (brand + statutory acronyms/proper nouns).
const NO_TRANSLATE = new Set([
  'Bharat Shram Setu', 'BSS', 'Aadhaar', 'PAN', 'IFSC', 'UAN', 'EPFO', 'ESIC',
  'GSTIN', 'KYC', 'BOCW', 'CLRA', 'OTP', 'MPIN', 'QR', 'UPI', 'NEFT', 'RTGS', 'SAP',
]);

type TrackedValue = { source: string; applied: string };

function isEligible(element: Element): boolean {
  let node: Element | null = element;
  while (node) {
    if (SKIP_TAGS.has(node.tagName)) return false;
    if (node.classList.contains('notranslate') || node.hasAttribute('data-no-translate')) return false;
    node = node.parentElement;
  }
  return true;
}

function looksTranslatable(core: string, curated: Set<string>): boolean {
  return core.length >= 2 && /[A-Za-z]/.test(core) && !curated.has(core) && !NO_TRANSLATE.has(core);
}

export default function AutoTranslate() {
  const { language } = useLanguage();
  const tracked = useRef(new Map<Text, TrackedValue>());
  const attrTracked = useRef(new Map<Element, Map<string, TrackedValue>>());
  const generation = useRef(0);
  const suppressUntil = useRef(0);
  const languageRef = useRef<Language>(language);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restore = useCallback(() => {
    tracked.current.forEach((rec, node) => {
      if (node.isConnected && node.nodeValue === rec.applied) node.nodeValue = rec.source;
    });
    tracked.current.clear();
    attrTracked.current.forEach((attrs, element) => {
      if (!element.isConnected) return;
      attrs.forEach((rec, attr) => {
        if (element.getAttribute(attr) === rec.applied) element.setAttribute(attr, rec.source);
      });
    });
    attrTracked.current.clear();
  }, []);

  const run = useCallback(async () => {
    if (typeof document === 'undefined' || !document.body) return;
    const lang = languageRef.current;
    const gen = ++generation.current;
    if (lang === 'en') { restore(); return; }

    const curated = dictionaryValuesFor(lang);

    const nodes: Text[] = [];
    const cores: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode() as Text | null;
    while (textNode) {
      const current = textNode.nodeValue ?? '';
      const rec = tracked.current.get(textNode);
      if (rec && current === rec.applied) { textNode = walker.nextNode() as Text | null; continue; }
      if (rec) tracked.current.delete(textNode);
      const parent = textNode.parentElement;
      const core = current.trim();
      if (parent && looksTranslatable(core, curated) && isEligible(parent)) {
        nodes.push(textNode);
        cores.push(core);
      }
      textNode = walker.nextNode() as Text | null;
    }

    if (nodes.length) {
      const results = await translateBatch(lang, cores);
      if (gen !== generation.current) return;
      suppressUntil.current = performance.now() + 200;
      nodes.forEach((node, index) => {
        const core = cores[index];
        const value = results[index];
        if (!value || value === core) return;
        const current = node.nodeValue ?? '';
        const start = current.indexOf(core);
        if (start < 0) return;
        const applied = current.slice(0, start) + value + current.slice(start + core.length);
        node.nodeValue = applied;
        tracked.current.set(node, { source: current, applied });
      });
    }

    const elements = Array.from(document.body.querySelectorAll('[placeholder],[aria-label],[title],[alt]'));
    const attrPlan: Array<{ element: Element; attr: string; core: string }> = [];
    for (const element of elements) {
      if (!isEligible(element)) continue;
      for (const attr of TRANSLATE_ATTRS) {
        const raw = element.getAttribute(attr);
        if (raw === null) continue;
        const existing = attrTracked.current.get(element)?.get(attr);
        if (existing && raw === existing.applied) continue;
        const core = raw.trim();
        if (looksTranslatable(core, curated)) attrPlan.push({ element, attr, core });
      }
    }
    if (attrPlan.length) {
      const results = await translateBatch(lang, attrPlan.map(item => item.core));
      if (gen !== generation.current) return;
      suppressUntil.current = performance.now() + 200;
      attrPlan.forEach((item, index) => {
        const value = results[index];
        if (!value || value === item.core) return;
        const raw = item.element.getAttribute(item.attr) ?? '';
        const start = raw.indexOf(item.core);
        if (start < 0) return;
        const applied = raw.slice(0, start) + value + raw.slice(start + item.core.length);
        item.element.setAttribute(item.attr, applied);
        const map = attrTracked.current.get(item.element) ?? new Map<string, TrackedValue>();
        map.set(item.attr, { source: raw, applied });
        attrTracked.current.set(item.element, map);
      });
    }
  }, [restore]);

  // Re-translate whenever the active language changes (restore English first so
  // a switch between two non-English languages translates from the source).
  useEffect(() => {
    languageRef.current = language;
    restore();
    void run();
  }, [language, restore, run]);

  // Pick up DOM rendered after navigation / state updates.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return;
    const schedule = () => {
      if (performance.now() < suppressUntil.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void run(); }, 350);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [run]);

  return null;
}
