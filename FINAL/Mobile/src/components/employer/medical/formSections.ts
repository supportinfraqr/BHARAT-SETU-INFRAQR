/** Split the combined Gazette document (Form-VIII + Form-IX) into per-form
 *  documents so the BSS Admin studio can edit/lock each form independently.
 *  The stored template keeps both sections; the studio edits one at a time and
 *  merges the edited section back. */

export type FormType = 'VIII' | 'IX';

const sectionRe = (type: FormType) => new RegExp(`<section\\s+data-form="${type}"[^>]*>[\\s\\S]*?<\\/section>`, 'i');

export function extractSection(html: string, type: FormType): string {
  return html.match(sectionRe(type))?.[0] ?? '';
}

/** A self-contained document containing only the requested form's section. */
export function documentFor(html: string, type: FormType): string {
  if (!html) return html;
  const first = html.search(/<section\s+data-form=/i);
  const last = html.toLowerCase().lastIndexOf('</section>');
  if (first === -1 || last === -1) return html;
  const before = html.slice(0, first);
  const after = html.slice(last + '</section>'.length);
  const section = extractSection(html, type);
  if (!section) return `${before}${after}`;
  return `${before}${section}${after}`;
}

/** Merge an edited single-form document back into the combined stored HTML. */
export function mergeSection(fullHtml: string, type: FormType, editedDoc: string): string {
  const section = extractSection(editedDoc, type);
  if (!section) return fullHtml;
  const re = sectionRe(type);
  if (re.test(fullHtml)) return fullHtml.replace(re, () => section);
  return fullHtml.replace(/<\/body>/i, () => `\n${section}\n</body>`);
}

export const FORM_TYPES: FormType[] = ['VIII', 'IX'];
export const FORM_LABEL: Record<FormType, string> = { VIII: 'Form-VIII · factory', IX: 'Form-IX · mines' };
