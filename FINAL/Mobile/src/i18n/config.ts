export const locales = [
  { code: 'en', abbreviation: 'EN', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', abbreviation: 'HI', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'bn', abbreviation: 'BN', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'te', abbreviation: 'TE', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'mr', abbreviation: 'MR', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'ta', abbreviation: 'TA', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'ur', abbreviation: 'UR', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'gu', abbreviation: 'GU', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  { code: 'kn', abbreviation: 'KN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'or', abbreviation: 'OR', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dir: 'ltr' },
  { code: 'ml', abbreviation: 'ML', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  { code: 'pa', abbreviation: 'PA', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'as', abbreviation: 'AS', name: 'Assamese', nativeName: 'অসমীয়া', dir: 'ltr' },
  { code: 'mai', abbreviation: 'MAI', name: 'Maithili', nativeName: 'मैथिली', dir: 'ltr' },
  { code: 'sat', abbreviation: 'SAT', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', dir: 'ltr' },
  { code: 'ks', abbreviation: 'KS', name: 'Kashmiri', nativeName: 'کٲشُر', dir: 'rtl' },
] as const;

export type Language = typeof locales[number]['code'];
export const DEFAULT_LANGUAGE: Language = 'en';
export const isLanguage = (value: string): value is Language => locales.some(locale => locale.code === value);
export const getLocale = (code: Language) => locales.find(locale => locale.code === code) ?? locales[0];
