import { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { cleanTicketNumber, formatINR } from '../lib/kerala-utils';
import type { KeralaPrizeData } from './LiveKeralaResults';
import defaultDrawsData from '../data/kerala_draws.json';

const fallbackDraws = defaultDrawsData as unknown as Record<string, KeralaPrizeData>;

interface Props {
  draws?: Record<string, KeralaPrizeData>;
}

export default function KeralaTicketChecker({ draws = fallbackDraws }: Props) {
  const effectiveDraws = draws || fallbackDraws;
  const datesList = useMemo(() => Object.keys(effectiveDraws), [effectiveDraws]);
  const [ticketInput, setTicketInput] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(datesList[0] || '');
  const [checkResult, setCheckResult] = useState<{
    checked: boolean;
    won: boolean;
    prizeRank?: string;
    prizeAmount?: number;
    matchedNumber?: string;
    message?: string;
  } | null>(null);

  const activeDraw = effectiveDraws[selectedDate];

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim() || !activeDraw) return;

    const parsed = cleanTicketNumber(ticketInput);
    const num = parsed.number;
    const series = parsed.series;
    const last4 = num.slice(-4);

    // 1. Check 1st Prize
    if (activeDraw.first_prize) {
      const fpNum = activeDraw.first_prize.number;
      const fpSeries = activeDraw.first_prize.series;

      // Exact Match
      if (fpNum === num && (!series || fpSeries === series)) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setCheckResult({
          checked: true,
          won: true,
          prizeRank: '1st Prize (ഒന്നാം സമ്മാനം)',
          prizeAmount: activeDraw.first_prize.amount,
          matchedNumber: `${fpSeries} ${fpNum}`,
          message: '🎉 Bumper Winner! 1st Prize ₹75 Lakh / ₹1 Crore!'
        });
        return;
      }

      // Consolation Prize
      if (fpNum === num && series && fpSeries !== series) {
        confetti({ particleCount: 80, spread: 60 });
        setCheckResult({
          checked: true,
          won: true,
          prizeRank: 'Consolation Prize (സമാശ്വാസ സമ്മാനം)',
          prizeAmount: activeDraw.consolation_prize?.amount || 8000,
          matchedNumber: `${series} ${num}`,
          message: '🎉 Congratulations! You won the Consolation Prize ₹8,000!'
        });
        return;
      }
    }

    // 2. Check 2nd Prize
    if (activeDraw.second_prize) {
      for (const sp of activeDraw.second_prize) {
        if (sp.number === num) {
          confetti({ particleCount: 100, spread: 70 });
          setCheckResult({
            checked: true,
            won: true,
            prizeRank: '2nd Prize (രണ്ടാം സമ്മാനം)',
            prizeAmount: sp.amount || 500000,
            matchedNumber: num,
            message: '🎉 Congratulations! You won the 2nd Prize!'
          });
          return;
        }
      }
    }

    // 3. Check 3rd Prize (Last 4 digits or exact 4)
    if (activeDraw.third_prize?.includes(last4) || activeDraw.third_prize?.includes(num)) {
      confetti({ particleCount: 50, spread: 50 });
      setCheckResult({
        checked: true,
        won: true,
        prizeRank: '3rd Prize (മൂന്നാം സമ്മാനം)',
        prizeAmount: 5000,
        matchedNumber: last4,
        message: '🎉 Congratulations! You won the 3rd Prize ₹5,000!'
      });
      return;
    }

    // 4. Check 4th Prize (₹2,000)
    if (activeDraw.fourth_prize?.includes(last4)) {
      confetti({ particleCount: 40 });
      setCheckResult({
        checked: true,
        won: true,
        prizeRank: '4th Prize (നാലാം സമ്മാനം)',
        prizeAmount: 2000,
        matchedNumber: last4,
        message: '🎉 Congratulations! You won the 4th Prize ₹2,000!'
      });
      return;
    }

    // 5. Check 5th Prize (₹1,000)
    if (activeDraw.fifth_prize?.includes(last4)) {
      confetti({ particleCount: 30 });
      setCheckResult({
        checked: true,
        won: true,
        prizeRank: '5th Prize (അഞ്ചാം സമ്മാനം)',
        prizeAmount: 1000,
        matchedNumber: last4,
        message: '🎉 Congratulations! You won the 5th Prize ₹1,000!'
      });
      return;
    }

    // 6. Check 8th Prize (₹100)
    if (activeDraw.eighth_prize?.includes(last4)) {
      setCheckResult({
        checked: true,
        won: true,
        prizeRank: '8th Prize (എട്ടാം സമ്മാനം)',
        prizeAmount: 100,
        matchedNumber: last4,
        message: '🎉 You won the 8th Prize ₹100!'
      });
      return;
    }

    // Not Won
    setCheckResult({
      checked: true,
      won: false,
      message: 'No prize matched for this ticket. Better luck in the next 3:00 PM draw!'
    });
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
        <span className="text-xl">🎟️</span>
        <div>
          <h3 className="font-black text-sm sm:text-base text-slate-900 leading-tight">
            Kerala Lottery Ticket Checker • ടിക്കറ്റ് പരിശോധിക്കുക
          </h3>
          <p className="text-[11px] text-slate-500">
            Check your 6-digit ticket number against all prize tiers
          </p>
        </div>
      </div>

      <form onSubmit={handleCheck} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          
          {/* Date Selector */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
              Draw Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setCheckResult(null); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900"
            >
              {datesList.map(d => (
                <option key={d} value={d}>
                  {d.split('-').reverse().join('/')} ({draws[d]?.draw_name || 'Draw'})
                </option>
              ))}
            </select>
          </div>

          {/* Ticket Input */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
              Ticket Number (e.g. WN 845192 or 845192)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit number..."
                maxLength={9}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
              />
              <button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-transform active:scale-95 flex-shrink-0"
              >
                Check
              </button>
            </div>
          </div>

        </div>
      </form>

      {/* Result Display Banner */}
      {checkResult && (
        <div className={`p-4 rounded-2xl border text-center animate-in fade-in duration-200 ${
          checkResult.won
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-inner'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          {checkResult.won ? (
            <div className="space-y-1">
              <span className="inline-block text-2xl">🏆</span>
              <h4 className="font-black text-base sm:text-lg text-emerald-900">
                {checkResult.prizeRank}
              </h4>
              <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-800">
                {formatINR(checkResult.prizeAmount || 0)}
              </div>
              <p className="text-xs font-bold text-emerald-700">
                {checkResult.message}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="inline-block text-xl">ℹ️</span>
              <p className="text-xs font-bold text-slate-700">
                {checkResult.message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
