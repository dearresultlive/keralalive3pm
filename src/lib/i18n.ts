import { useState, useEffect } from 'react';

export type Language = 'en' | 'ml';

export const translations = {
  en: {
    siteTitle: 'Kerala Lottery Result Today 3:00 PM Live • Official Winning Numbers & PDF',
    liveBadge: 'LIVE AT 3:00 PM',
    upcomingTitle: 'UPCOMING 3:00 PM DRAW',
    liveDrawingTitle: 'DRAWING LIVE IN TRIVANDRUM',
    resultDeclared: 'OFFICIAL RESULT DECLARED',
    firstPrize: '1st Prize',
    consolationPrize: 'Consolation Prize',
    secondPrize: '2nd Prize',
    thirdPrize: '3rd Prize',
    fourthPrize: '4th Prize',
    fifthPrize: '5th Prize',
    sixthPrize: '6th Prize',
    seventhPrize: '7th Prize',
    eighthPrize: '8th Prize',
    viewGazettePdf: 'Download Official Signed Gazette PDF',
    officialGazette: 'Official Gazette Sheet',
    ticketCheckerTitle: 'Kerala Lottery Ticket Checker',
    ticketCheckerDesc: 'Enter your 6-digit ticket number or series to check instant prize status',
    checkButton: 'Check Result',
    todayResults: "Today's Result (3:00 PM)",
    yesterdayResults: "Yesterday's Result",
    guessingTitle: 'Kerala 3-Digit Guessing Numbers (A B C Board)',
    guessingDesc: 'Mathematical frequency chart and recurring 3-digit board target numbers',
    disclaimerText: 'Disclaimer: This portal is an independent real-time informational service. Winning ticket holders must verify results with the official Kerala Government Gazette published by Directorate of Kerala State Lotteries.',
    telegramJoin: 'Join Kerala Lottery Telegram Channel',
    shareText: 'Share Result'
  },
  ml: {
    siteTitle: 'കേരള ലോട്ടറി ഫലം ഇന്ന് 3:00 PM ലൈവ് • ഇന്നത്തെ ഭാഗ്യക്കുറി നമ്പറുകൾ',
    liveBadge: '3:00 PM ലൈവ് ഫലം',
    upcomingTitle: 'അടുത്ത നറുക്കെടുപ്പ് 3:00 PM',
    liveDrawingTitle: 'നറുക്കെടുപ്പ് പുരോഗമിക്കുന്നു (ഗോർക്കി ഭവൻ)',
    resultDeclared: 'ഔദ്യോഗിക ഫലം പ്രഖ്യാപിച്ചു',
    firstPrize: 'ഒന്നാം സമ്മാനം',
    consolationPrize: 'സമാശ്വാസ സമ്മാനം',
    secondPrize: 'രണ്ടാം സമ്മാനം',
    thirdPrize: 'മൂന്നാം സമ്മാനം',
    fourthPrize: 'നാലാം സമ്മാനം',
    fifthPrize: 'അഞ്ചാം സമ്മാനം',
    sixthPrize: 'ആറാം സമ്മാനം',
    seventhPrize: 'ഏഴാം സമ്മാനം',
    eighthPrize: 'എട്ടാം സമ്മാനം',
    viewGazettePdf: 'ഔദ്യോഗിക ഗസറ്റ് PDF ഡൗൺലോഡ് ചെയ്യുക',
    officialGazette: 'ഔദ്യോഗിക ഗസറ്റ് ഷീറ്റ്',
    ticketCheckerTitle: 'ലോട്ടറി ടിക്കറ്റ് പരിശോധിക്കുക',
    ticketCheckerDesc: 'സമ്മാനം ലഭിച്ചിട്ടുണ്ടോ എന്ന് പരിശോധിക്കാൻ 6 അക്ക ടിക്കറ്റ് നമ്പർ നൽകുക',
    checkButton: 'പരിശോധിക്കുക',
    todayResults: 'ഇന്നത്തെ ഫലം (3:00 PM)',
    yesterdayResults: 'ഇന്നലത്തെ ഫലം',
    guessingTitle: 'കേരള ലോട്ടറി ഗസ്സിംഗ് നമ്പറുകൾ (A B C ബോർഡ്)',
    guessingDesc: 'പതിവായി വരുന്ന നമ്പറുകളുടെ വിശകലനവും ടാർഗെറ്റ് ചാർട്ടും',
    disclaimerText: 'നിരാകരണം: ഈ പോർട്ടൽ വിവര ആവശ്യങ്ങൾക്ക് മാത്രമുള്ളതാണ്. സമ്മാനാർഹമായ ടിക്കറ്റുകൾ കേരള ലോട്ടറി ഡയറക്ടറേറ്റ് പ്രസിദ്ധീകരിക്കുന്ന ഔദ്യോഗിക ഗസറ്റുമായി ഒത്തുനോക്കേണ്ടതാണ്.',
    telegramJoin: 'കേരള ലോട്ടറി ടെലിഗ്രാം ചാനലിൽ ചേരുക',
    shareText: 'ഫലം ഷെയർ ചെയ്യുക'
  }
};

export function useLanguage() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('kerala_lang') as Language;
    if (saved === 'en' || saved === 'ml') {
      setLang(saved);
    } else {
      // Default to English with easy toggle to Malayalam
      setLang('en');
    }
  }, []);

  const toggleLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('kerala_lang', newLang);
  };

  return { lang, t: translations[lang], toggleLanguage };
}
