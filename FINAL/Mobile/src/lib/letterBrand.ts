/** Letter header branding — keep in sync with backend `bss_core/letter_brand.py`. */

/**
 * Hosted on the frontend `public/` folder so WeasyPrint can fetch it server-side
 * when rendering a letter to PDF. Must be an absolute HTTPS URL.
 */
export const DEFAULT_LETTER_LOGO = "https://login.bharatshramsetu.com/bss-brand/bharatshramsetu-logo.png";

/**
 * Print-safe overrides for the logo header. WeasyPrint does not support flexbox,
 * so the brand row must be a table; the logo also needs an explicit height or a
 * portrait PNG renders at its full 372x424 natural size.
 */
export const LETTER_BRAND_CSS = `
  .bss-letter-brand { display:table; width:100%; border-bottom:2.5px solid #073B67; padding-bottom:5px; margin-bottom:8px; }
  .bss-letter-brand .brand-left, .bss-letter-brand .brand-title { display:table-cell; vertical-align:middle; }
  .bss-letter-brand .brand-left { width:46px; }
  .bss-letter-brand .brand-logo { height:34px; width:auto; max-width:46px; vertical-align:middle; margin-right:8px; }
  .bss-letter-brand .brand-title strong { color:#073B67; font-size:15px; display:block; }
  .bss-letter-brand .brand-title span { display:block; font-size:8.5px; color:#6b7280; letter-spacing:1.2px; text-transform:uppercase; }
`;

/** The logo <img> markup used in the WYSIWYG canvas, where the URL must resolve. */
export const LETTER_LOGO_IMG = `<img src="${DEFAULT_LETTER_LOGO}" data-token="logoUrl" alt="Logo" class="brand-logo" style="max-height:50px;width:auto;display:inline-block;vertical-align:middle;margin:4px 8px 4px 0;" />`;
