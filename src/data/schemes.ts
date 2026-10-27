export interface KeralaSchemeInfo {
  id: string;
  code: string;
  name: string;
  nameMl: string;
  day: string;
  dayMl: string;
  firstPrize: number;
  firstPrizeFormatted: string;
  ticketPrice: number;
  color: string;
  badgeBg: string;
}

export const KERALA_WEEKLY_SCHEMES: Record<number, KeralaSchemeInfo> = {
  // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  0: {
    id: 'akshaya',
    code: 'AK',
    name: 'Akshaya',
    nameMl: 'അക്ഷയ',
    day: 'Sunday',
    dayMl: 'ഞായർ',
    firstPrize: 7000000,
    firstPrizeFormatted: '₹70 Lakhs',
    ticketPrice: 40,
    color: '#0284c7',
    badgeBg: 'bg-sky-500'
  },
  1: {
    id: 'win-win',
    code: 'W',
    name: 'Win-Win',
    nameMl: 'വിൻ-വിൻ',
    day: 'Monday',
    dayMl: 'തിങ്കൾ',
    firstPrize: 7500000,
    firstPrizeFormatted: '₹75 Lakhs',
    ticketPrice: 40,
    color: '#2563eb',
    badgeBg: 'bg-blue-600'
  },
  2: {
    id: 'sthree-sakthi',
    code: 'SS',
    name: 'Sthree Sakthi',
    nameMl: 'സ്ത്രീ ശക്തി',
    day: 'Tuesday',
    dayMl: 'ചൊവ്വ',
    firstPrize: 7500000,
    firstPrizeFormatted: '₹75 Lakhs',
    ticketPrice: 40,
    color: '#db2777',
    badgeBg: 'bg-pink-600'
  },
  3: {
    id: 'fifty-fifty',
    code: 'FF',
    name: 'Fifty-Fifty',
    nameMl: 'ഫിഫ്റ്റി-ഫിഫ്റ്റി',
    day: 'Wednesday',
    dayMl: 'ബുധൻ',
    firstPrize: 10000000,
    firstPrizeFormatted: '₹1 Crore',
    ticketPrice: 50,
    color: '#ea580c',
    badgeBg: 'bg-orange-600'
  },
  4: {
    id: 'karunya-plus',
    code: 'KN',
    name: 'Karunya Plus',
    nameMl: 'കാരുണ്യ പ്ലസ്',
    day: 'Thursday',
    dayMl: 'വ്യാഴം',
    firstPrize: 8000000,
    firstPrizeFormatted: '₹80 Lakhs',
    ticketPrice: 40,
    color: '#7c3aed',
    badgeBg: 'bg-violet-600'
  },
  5: {
    id: 'nirmal',
    code: 'NR',
    name: 'Nirmal',
    nameMl: 'നിർമ്മൽ',
    day: 'Friday',
    dayMl: 'വെള്ളി',
    firstPrize: 7000000,
    firstPrizeFormatted: '₹70 Lakhs',
    ticketPrice: 40,
    color: '#059669',
    badgeBg: 'bg-emerald-600'
  },
  6: {
    id: 'karunya',
    code: 'KR',
    name: 'Karunya',
    nameMl: 'കാരുണ്യ',
    day: 'Saturday',
    dayMl: 'ശനി',
    firstPrize: 8000000,
    firstPrizeFormatted: '₹80 Lakhs',
    ticketPrice: 40,
    color: '#b45309',
    badgeBg: 'bg-amber-700'
  }
};

export const KERALA_BUMPERS = [
  { id: 'thiruvonam-bumper', code: 'BR-93', name: 'Thiruvonam (Onam) Bumper', nameMl: 'തിരുവോണം ബമ്പർ', firstPrize: '₹25 Crore', drawMonth: 'September' },
  { id: 'vishu-bumper', code: 'BR-90', name: 'Vishu Bumper', nameMl: 'വിഷു ബമ്പർ', firstPrize: '₹12 Crore', drawMonth: 'May' },
  { id: 'xmas-new-year-bumper', code: 'BR-95', name: 'Xmas New Year Bumper', nameMl: 'ക്രിസ്മസ് ന്യൂ ഇയർ ബമ്പർ', firstPrize: '₹20 Crore', drawMonth: 'January' },
  { id: 'pooja-bumper', code: 'BR-94', name: 'Pooja Bumper', nameMl: 'പൂജ ബമ്പർ', firstPrize: '₹12 Crore', drawMonth: 'November' },
  { id: 'monsoon-bumper', code: 'BR-92', name: 'Monsoon Bumper', nameMl: 'മൺസൂൺ ബമ്പർ', firstPrize: '₹10 Crore', drawMonth: 'July' },
  { id: 'summer-bumper', code: 'BR-89', name: 'Summer Bumper', nameMl: 'സമ്മർ ബമ്പർ', firstPrize: '₹10 Crore', drawMonth: 'March' }
];

export const BUMPER_SCHEMES = KERALA_BUMPERS;
