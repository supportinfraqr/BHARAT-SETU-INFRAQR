import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../src/i18n/config.ts', import.meta.url), 'utf8');
const localeCodes = [...config.matchAll(/code:\s*'([a-z]+)'/g)].map((match) => match[1]);
const dictionaries = [
  'src/locales/loginTranslations.ts',
  'src/locales/dashboardTranslations.ts',
  'src/locales/workerTranslations.ts',
  'src/locales/portalTranslations.ts',
];

let invalid = false;
for (const file of dictionaries) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const available = new Set([...source.matchAll(/^\s{2}([a-z]+):(?:\s*\{|\s*[a-z]+,)/gm)].map((match) => match[1]));
  const missing = localeCodes.filter((locale) => !available.has(locale));
  if (missing.length) {
    console.error(`${file}: missing locales: ${missing.join(', ')}`);
    invalid = true;
  }
}

if (invalid) process.exit(1);
console.log(`i18n check passed for ${localeCodes.length} locales and ${dictionaries.length} dictionaries.`);
