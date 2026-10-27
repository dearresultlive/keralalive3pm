import type { Language } from '../lib/i18n';

interface Props {
  currentLang: Language;
  onToggle: (lang: Language) => void;
}

export default function LanguageToggle({ currentLang, onToggle }: Props) {
  return (
    <div className="inline-flex items-center bg-emerald-950/40 p-1 rounded-xl border border-emerald-500/30 text-xs font-bold text-white shadow-inner">
      <button
        type="button"
        onClick={() => onToggle('en')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          currentLang === 'en'
            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
            : 'text-emerald-200 hover:text-white'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onToggle('ml')}
        className={`px-2.5 py-1 rounded-lg transition-all font-malayalam ${
          currentLang === 'ml'
            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
            : 'text-emerald-200 hover:text-white'
        }`}
      >
        മലയാളം
      </button>
    </div>
  );
}
