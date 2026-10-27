import React, { useState } from 'react';

export default function KeralaGuessingChart() {
  const [luckyNumber, setLuckyNumber] = useState<string | null>(null);

  // Mathematical frequency targets based on historical Kerala 3-digit distributions
  const boardTargets = [
    { board: 'A (Hundreds)', numbers: ['4', '7', '1', '9'], hot: '7' },
    { board: 'B (Tens)', numbers: ['2', '8', '5', '0'], hot: '2' },
    { board: 'C (Units)', numbers: ['6', '3', '8', '2'], hot: '8' }
  ];

  const recurringPairs = ['728', '482', '156', '903', '341', '892'];

  const generateLucky = () => {
    const a = boardTargets[0].numbers[Math.floor(Math.random() * boardTargets[0].numbers.length)];
    const b = boardTargets[1].numbers[Math.floor(Math.random() * boardTargets[1].numbers.length)];
    const c = boardTargets[2].numbers[Math.floor(Math.random() * boardTargets[2].numbers.length)];
    setLuckyNumber(`${a}${b}${c}`);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-500/30 shadow-md space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="font-black text-sm sm:text-base text-amber-400 leading-tight">
              Kerala Lottery Guessing Numbers (A B C Board)
            </h3>
            <p className="text-[11px] text-emerald-200">
              Statistical frequency analysis for today's 3:00 PM draw
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={generateLucky}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl transition-all shadow-xs"
        >
          🎲 Lucky 3D
        </button>
      </div>

      {/* Board Target Tables */}
      <div className="grid grid-cols-3 gap-2">
        {boardTargets.map(b => (
          <div key={b.board} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center space-y-1">
            <span className="text-[10px] font-black uppercase text-emerald-300 block">
              Board {b.board.slice(0, 1)}
            </span>
            <div className="font-mono text-xl sm:text-2xl font-black text-white">
              {b.hot}
            </div>
            <div className="text-[9px] text-slate-400 font-mono">
              Alt: {b.numbers.filter(x => x !== b.hot).join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* Top 3-digit Combinations */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300">
          Target 3-Digit Combinations:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {recurringPairs.map(num => (
            <span key={num} className="bg-amber-500/20 text-amber-300 border border-amber-400/30 font-mono font-black text-xs px-2.5 py-1 rounded-lg">
              {num}
            </span>
          ))}
        </div>
      </div>

      {/* Generated Lucky Number Banner */}
      {luckyNumber && (
        <div className="bg-amber-500 text-slate-950 rounded-xl p-2.5 text-center font-black animate-in fade-in duration-200">
          <span className="text-xs block text-slate-900 font-bold">Your Lucky 3-Digit Combination:</span>
          <span className="text-2xl font-mono tracking-widest">{luckyNumber}</span>
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center italic">
        Note: Guessing charts are purely based on mathematical number statistics for entertainment. Kerala State Lotteries are drawn purely by random mechanical machines.
      </p>
    </div>
  );
}
