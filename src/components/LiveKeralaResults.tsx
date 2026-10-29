import { useState, useEffect, useMemo } from 'react';
import {
  getISTNow,
  getISTDateString,
  getTodayKeralaScheme,
  getKeralaDrawCountdown,
  formatINR
} from '../lib/kerala-utils';
import { useLanguage } from '../lib/i18n';
import LanguageToggle from './LanguageToggle';
import defaultDrawsData from '../data/kerala_draws.json';

export interface KeralaPrizeData {
  scheme_id?: string;
  draw_number?: string;
  draw_name?: string;
  draw_name_ml?: string;
  draw_date?: string;
  draw_time?: string;
  status?: string;
  first_prize?: { series: string; number: string; amount: number };
  consolation_prize?: { number: string; amount: number };
  second_prize?: Array<{ series?: string; number: string; amount: number }>;
  third_prize?: string[];
  fourth_prize?: string[];
  fifth_prize?: string[];
  sixth_prize?: string[];
  seventh_prize?: string[];
  eighth_prize?: string[];
  official_pdf_url?: string;
}

const fallbackDraws = defaultDrawsData as unknown as Record<string, KeralaPrizeData>;

interface Props {
  initialDraws?: Record<string, KeralaPrizeData>;
  todayDateStr?: string;
}

export default function LiveKeralaResults({
  initialDraws = fallbackDraws,
  todayDateStr = getISTDateString()
}: Props) {
  const { lang, toggleLanguage } = useLanguage();
  const effectiveDraws = initialDraws || fallbackDraws;
  const latestDeclaredDate = Object.keys(effectiveDraws).find(d => Boolean(effectiveDraws[d]?.first_prize?.number)) || todayDateStr;
  const defaultDate = effectiveDraws[todayDateStr]?.first_prize?.number ? todayDateStr : latestDeclaredDate;
  const [activeDateStr, setActiveDateStr] = useState<string>(defaultDate);
  const [drawsDb, setDrawsDb] = useState<Record<string, KeralaPrizeData>>(effectiveDraws);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const triggerConfetti = () => {
    if (typeof window !== 'undefined') {
      import('canvas-confetti').then((m) => {
        const c = m.default || m;
        c({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }).catch(() => {});
    }
  };

  const fetchLatestDraws = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/latest.json?t=${Date.now()}`);
      if (res.ok) {
        const data = (await res.json()) as Record<string, KeralaPrizeData>;
        if (data && typeof data === 'object') {
          const previouslyDeclared = Boolean(drawsDb[todayDateStr]?.first_prize?.number);
          const newlyDeclared = Boolean(data[todayDateStr]?.first_prize?.number);
          if (!previouslyDeclared && newlyDeclared) {
            triggerConfetti();
          }
          setDrawsDb(data);
          setLastRefreshedAt(
            new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, minute: '2-digit', second: '2-digit' })
          );
        }
      }
    } catch {
      // Fail silently on network drop
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const istNow = useMemo(() => getISTNow(), []);
  const todayScheme = useMemo(() => getTodayKeralaScheme(istNow), [istNow]);
  const [countdown, setCountdown] = useState(getKeralaDrawCountdown(istNow));

  // Ticking countdown clock until 3:00 PM
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getKeralaDrawCountdown(getISTNow()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDraw = drawsDb[activeDateStr] || null;
  const isDeclared = Boolean(activeDraw?.first_prize?.number);

  // Auto-poll every 25 seconds when in live draw window (2:55 PM to 4:30 PM IST) and today's draw is not declared
  useEffect(() => {
    if (isDeclared && activeDateStr === todayDateStr) {
      return;
    }

    const pollInterval = setInterval(() => {
      const ist = getISTNow();
      const currentMinutes = ist.getHours() * 60 + ist.getMinutes();
      // 2:55 PM (895m) to 4:30 PM (990m)
      if (currentMinutes >= 895 && currentMinutes <= 990) {
        fetchLatestDraws(true);
      }
    }, 25000);

    return () => clearInterval(pollInterval);
  }, [isDeclared, activeDateStr, todayDateStr, drawsDb]);

  // Past 7 days list for date dropdown
  const pastDates = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const base = new Date(getISTNow());
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const iso = getISTDateString(d);
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const [y, m, day] = iso.split('-');
      const formatted = `${day}/${m}/${y}`;
      let label = `${formatted} (${dayName})`;
      if (i === 0) label = `Today • ${formatted}`;
      if (i === 1) label = `Yesterday • ${formatted}`;
      list.push({ value: iso, label });
    }
    return list;
  }, []);

  const shareText = isDeclared
    ? `🎯 *Kerala Lottery Result (${activeDraw?.draw_name || todayScheme.name} • 3:00 PM)*\n📅 Date: ${activeDateStr}\n🏆 *1st Prize (${formatINR(activeDraw?.first_prize?.amount || todayScheme.firstPrize)})*: *${activeDraw?.first_prize?.series || ''} ${activeDraw?.first_prize?.number || ''}*\n\n👉 View official gazette & all prize numbers:\nhttps://keralalive3pm.com/`
    : `🎯 *Kerala Lottery Result Today (${todayScheme.name} • 3:00 PM)*\n🏆 1st Prize: ${todayScheme.firstPrizeFormatted}\n\n👉 Watch 3:00 PM Live Draw result:\nhttps://keralalive3pm.com/`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="space-y-3.5">
      
      {/* Language Switcher, Refresh & Live Status Top Bar */}
      <div className="flex items-center justify-between gap-2 bg-emerald-900/60 p-2 rounded-2xl border border-emerald-700/50">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-black text-emerald-100 uppercase tracking-wide">
            {lang === 'ml' ? '3:00 PM ലൈവ് നറുക്കെടുപ്പ്' : '3:00 PM Live Draw'}
          </span>
          {lastRefreshedAt && (
            <span className="hidden md:inline text-[10px] text-emerald-300/80 font-mono">
              (Checked {lastRefreshedAt})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLatestDraws(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 bg-emerald-800/90 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-emerald-100 font-bold text-xs px-2.5 py-1 rounded-xl transition-all border border-emerald-600/40 cursor-pointer"
            title="Check for newest lottery numbers"
          >
            <span className={isRefreshing ? "inline-block animate-spin" : ""}>🔄</span>
            <span className="hidden sm:inline">{isRefreshing ? 'Checking...' : 'Refresh'}</span>
          </button>
          <LanguageToggle currentLang={lang} onToggle={toggleLanguage} />
        </div>
      </div>

      {/* Main Draw Result Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-emerald-600 shadow-md overflow-hidden">
        
        {/* Card Header with Scheme Badge & Day */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-amber-500/40">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black text-white ${todayScheme.badgeBg} shadow-xs`}>
                {activeDraw?.draw_number || todayScheme.code}
              </span>
              <h2 className="font-black text-base sm:text-lg text-white">
                {lang === 'ml' ? (activeDraw?.draw_name_ml || todayScheme.nameMl) : (activeDraw?.draw_name || todayScheme.name)}
              </h2>
            </div>
            <p className="text-[11px] text-emerald-200 mt-0.5">
              Draw Date: <span className="font-bold text-white">{activeDateStr.split('-').reverse().join('/')}</span> • 3:00 PM IST
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-amber-300 block tracking-wider">
              {lang === 'ml' ? 'ഒന്നാം സമ്മാനം' : '1st Prize Amount'}
            </span>
            <span className="text-base sm:text-xl font-black text-white font-mono">
              {formatINR(activeDraw?.first_prize?.amount || todayScheme.firstPrize)}
            </span>
          </div>
        </div>

        {/* Card Body: Status Driven Display */}
        <div className="p-4 sm:p-6 text-center">
          
          {isDeclared ? (
            /* 1. DECLARED STATE: Massive 1st Prize Winner Display */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 text-xs font-black px-3 py-1 rounded-full border border-emerald-300">
                <span>✅</span>
                <span>{lang === 'ml' ? 'ഔദ്യോഗിക ഫലം പ്രഖ്യാപിച്ചു • VERIFIED' : 'OFFICIAL RESULT DECLARED • VERIFIED'}</span>
              </div>

              {/* Huge 1st Prize Ticket Number */}
              <div className="py-2 sm:py-3 bg-amber-50/70 border-2 border-amber-300 rounded-2xl shadow-inner max-w-md mx-auto">
                <span className="text-xs font-black text-amber-800 uppercase tracking-widest block mb-1">
                  {lang === 'ml' ? '🏆 ഒന്നാം സമ്മാന വിജയി (₹' + (activeDraw.first_prize?.amount ? (activeDraw.first_prize.amount / 100000) + ' ലക്ഷം' : '75 ലക്ഷം') + ')' : '🏆 1st Prize Winning Ticket Number'}
                </span>
                <div className="font-mono font-black text-4xl sm:text-6xl text-emerald-950 tracking-wider">
                  <span className="text-amber-600 mr-2">{activeDraw.first_prize?.series}</span>
                  <span>{activeDraw.first_prize?.number}</span>
                </div>
                {activeDraw.consolation_prize?.amount && (
                  <p className="text-xs text-slate-600 font-bold mt-1.5">
                    {lang === 'ml' ? 'സമാശ്വാസ സമ്മാനം: ₹8,000 (മറ്റു എല്ലാ സീരീസുകൾക്കും)' : 'Consolation Prize: ₹8,000 for matching number in other series'}
                  </p>
                )}
              </div>

              {/* 2nd Prize Card */}
              {activeDraw.second_prize && activeDraw.second_prize.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-md mx-auto">
                  <span className="text-xs font-black text-slate-700 uppercase block mb-1">
                    {lang === 'ml' ? '🥈 രണ്ടാം സമ്മാനം (₹5,00,000)' : '🥈 2nd Prize (₹5,00,000)'}
                  </span>
                  <div className="font-mono font-black text-2xl text-slate-900 tracking-wider">
                    {activeDraw.second_prize.map(p => `${p.series ? p.series + ' ' : ''}${p.number}`).join(', ')}
                  </div>
                </div>
              )}

              {/* Share & Download Buttons */}
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25d366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
                >
                  <span>💬</span>
                  <span>WhatsApp Share</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareText);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
                >
                  <span>📋</span>
                  <span>{copiedLink ? 'Copied!' : 'Copy Numbers'}</span>
                </button>
              </div>

              {/* Official Gazette PDF Link */}
              {activeDraw.official_pdf_url && (
                <div className="pt-2">
                  <a
                    href={activeDraw.official_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 transition-colors"
                  >
                    <span>📄</span>
                    <span>{lang === 'ml' ? 'ഔദ്യോഗിക ഗസറ്റ് PDF തുറക്കുക' : 'View Official Government Signed Gazette PDF'}</span>
                  </a>
                </div>
              )}
            </div>
          ) : countdown.isLive ? (
            /* 2. LIVE DRAWING WINDOW (2:55 PM - 3:30 PM) */
            <div className="space-y-3 py-4">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 text-xs font-black px-4 py-1.5 rounded-full border border-red-300 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span>{lang === 'ml' ? 'നറുക്കെടുപ്പ് പുരോഗമിക്കുന്നു (ഗോർക്കി ഭവൻ, തിരുവനന്തപുരം)' : 'DRAWING LIVE IN GORKY BHAVAN, TRIVANDRUM'}</span>
              </div>
              <p className="text-sm font-bold text-slate-700 max-w-md mx-auto">
                {lang === 'ml'
                  ? 'ഇന്നത്തെ 3:00 PM ഭാഗ്യക്കുറി നറുക്കെടുപ്പ് ലൈവ് ആയി നടക്കുന്നു. ഒന്നാം സമ്മാന നമ്പർ ഏതാനും നിമിഷങ്ങൾക്കകം ഇവിടെ അപ്ഡേറ്റ് ആകും.'
                  : "Today's 3:00 PM draw is taking place. 1st Prize ₹75 Lakh ticket number will appear here within moments."}
              </p>
              <div className="flex items-center justify-center gap-2 font-mono text-xs text-slate-500 pt-1">
                <span className="animate-pulse">Auto-checking live updates...</span>
                <button
                  type="button"
                  onClick={() => fetchLatestDraws(false)}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer disabled:opacity-50"
                >
                  <span className={isRefreshing ? "inline-block animate-spin" : ""}>🔄</span>
                  <span>{isRefreshing ? 'Checking...' : 'Check Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* 3. UPCOMING COUNTDOWN (Before 2:55 PM or Next Day) */
            <div className="space-y-3 py-4">
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
                <span>⏰</span>
                <span>
                  {countdown.isPast
                    ? (lang === 'ml' ? 'അടുത്ത നറുക്കെടുപ്പ് നാളെ 3:00 PM' : 'NEXT DRAW TOMORROW 3:00 PM')
                    : (lang === 'ml' ? 'അടുത്ത നറുക്കെടുപ്പ് ഇന്ന് 3:00 PM' : 'UPCOMING TODAY 3:00 PM DRAW')}
                </span>
              </div>

              {/* Countdown Digits */}
              <div className="font-mono text-3xl sm:text-5xl font-black text-slate-900 tracking-wider">
                <span>{String(countdown.hours).padStart(2, '0')}</span>
                <span className="text-slate-400 mx-1">:</span>
                <span>{String(countdown.minutes).padStart(2, '0')}</span>
                <span className="text-slate-400 mx-1">:</span>
                <span className="text-emerald-600">{String(countdown.seconds).padStart(2, '0')}</span>
              </div>

              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {lang === 'ml'
                  ? (countdown.isPast
                      ? 'ഇന്നത്തെ നറുക്കെടുപ്പ് പൂർത്തിയായി. അടുത്ത ലൈവ് നറുക്കെടുപ്പ് നാളെ ഉച്ചയ്ക്ക് 3:00 മണിക്ക്.'
                      : 'ഇന്നത്തെ ഭാഗ്യക്കുറി നറുക്കെടുപ്പ് ഉച്ചയ്ക്ക് 3:00 മണിക്ക് ആരംഭിക്കും. തത്സമയ ഫലങ്ങൾക്കായി പേജ് കാത്തിരിക്കുക.')
                  : (countdown.isPast
                      ? "Today's draw has concluded. Next live draw begins tomorrow at 3:00 PM IST."
                      : 'Official Kerala State Lottery draw starts at 3:00 PM IST. Live winning numbers will be declared here instantly.')}
              </p>
            </div>
          )}

        </div>

        {/* Date Selector Footer Bar */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between gap-3 text-xs">
          <label htmlFor="kerala-date-select" className="font-bold text-slate-700 flex items-center gap-1.5 flex-shrink-0">
            <span>📅</span>
            <span>Select Date:</span>
          </label>
          <select
            id="kerala-date-select"
            value={activeDateStr}
            onChange={(e) => setActiveDateStr(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
          >
            {pastDates.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* 3rd to 8th Prize Tables (Visible When Result is Declared) */}
      {isDeclared && (
        <div className="space-y-3 animate-in fade-in duration-300">
          
          {/* 3rd Prize (₹1,00,000 / ₹5,000) */}
          {activeDraw.third_prize && activeDraw.third_prize.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="font-black text-xs text-slate-800">
                  {lang === 'ml' ? '🥉 മൂന്നാം സമ്മാനം (3rd Prize)' : '🥉 3rd Prize'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ₹5,000
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 font-mono text-xs font-bold text-slate-900 text-center">
                {activeDraw.third_prize.map(n => (
                  <span key={`p3-${n}`} className="bg-slate-50 py-1 rounded border border-slate-200/60">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 4th & 5th Prize */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeDraw.fourth_prize && activeDraw.fourth_prize.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="font-black text-xs text-slate-800">4th Prize (നാലാം സമ്മാനം)</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">₹2,000</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 font-mono text-xs font-bold text-slate-900 text-center">
                  {activeDraw.fourth_prize.map(n => (
                    <span key={`p4-${n}`} className="bg-slate-50 py-1 rounded border border-slate-200/60">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {activeDraw.fifth_prize && activeDraw.fifth_prize.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="font-black text-xs text-slate-800">5th Prize (അഞ്ചാം സമ്മാനം)</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">₹1,000</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 font-mono text-xs font-bold text-slate-900 text-center">
                  {activeDraw.fifth_prize.map(n => (
                    <span key={`p5-${n}`} className="bg-slate-50 py-1 rounded border border-slate-200/60">{n}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 6th, 7th & 8th Prize Tables */}
          {activeDraw.eighth_prize && activeDraw.eighth_prize.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="font-black text-xs text-slate-800">8th Prize (എട്ടാം സമ്മാനം)</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">₹100 (Last 4 Digits)</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 font-mono text-[11px] font-bold text-slate-900 text-center">
                {activeDraw.eighth_prize.map(n => (
                  <span key={`p8-${n}`} className="bg-slate-50 py-1 rounded border border-slate-200/60">{n}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
