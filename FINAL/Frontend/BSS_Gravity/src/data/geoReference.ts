export const geoReference = {
  Maharashtra: {
    'Mumbai Suburban': [{ city: 'Mumbai', pins: ['400059', '400072'] }],
    Pune: [{ city: 'Pune', pins: ['411001', '411014'] }],
  },
  Bihar: {
    Patna: [{ city: 'Patna', pins: ['800001', '800020'] }],
    Gaya: [{ city: 'Gaya', pins: ['823001'] }],
  },
  'Madhya Pradesh': {
    Bhopal: [{ city: 'Bhopal', pins: ['462001', '462042'] }],
    Indore: [{ city: 'Indore', pins: ['452001'] }],
  },
} as const;