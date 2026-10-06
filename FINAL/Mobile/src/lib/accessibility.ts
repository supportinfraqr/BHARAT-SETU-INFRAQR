// Accessibility preference bootstrap. Kept in a plain (non-client) module so the
// root layout (a server component) can inline it via next/script before paint.
export const ACCESSIBILITY_STORAGE_KEY = 'bss-a11y-prefs';

// Applies the last-known choices before the portal paints, so a reload doesn't
// flash the default size/contrast/motion.
export const ACCESSIBILITY_BOOTSTRAP = `try{var p=JSON.parse(localStorage.getItem('${ACCESSIBILITY_STORAGE_KEY}')||'{}');var m={largeText:'bss-large-text',highContrast:'bss-high-contrast',reduceMotion:'bss-reduce-motion'};for(var k in m){document.documentElement.classList.toggle(m[k],!!p[k]);}}catch(e){}`;
