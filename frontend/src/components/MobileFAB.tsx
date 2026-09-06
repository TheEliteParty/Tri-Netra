import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Map, AlertTriangle, Plus, X, Radio } from 'lucide-react';
import { t } from '../i18n/translations';

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: Zap, label: t('simulateFab'), path: '/simulator', bg: 'bg-amber-500 text-white' },
    { icon: Map, label: t('riskMapFab'), path: '/map', bg: 'bg-sky-500 text-white' },
    { icon: AlertTriangle, label: t('alertsFab'), path: '/alerts', bg: 'bg-rose-500 text-white' },
    { icon: Radio, label: t('liveFab'), path: '/', bg: 'bg-emerald-500 text-white' },
  ];

  return (
    <div className="md:hidden fixed bottom-6 right-4 z-50">
      {/* Action buttons */}
      {open && (
        <div className="absolute bottom-16 right-0 space-y-2.5 animate-scale-in">
          {actions.map((action, i) => (
            <button
              key={action.path}
              onClick={() => { navigate(action.path); setOpen(false); }}
              className="flex items-center gap-2 group select-none ml-auto"
            >
              <span className="text-[11px] font-semibold text-slate-700 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 shadow-md">
                {action.label}
              </span>
              <div className={`w-11 h-11 rounded-2xl ${action.bg} flex items-center justify-center shadow-lg transform transition-transform active:scale-95`}>
                <action.icon className="w-5 h-5" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-600/25 transition-all duration-200 select-none ${
          open
            ? 'bg-slate-800 text-white rotate-45'
            : 'bg-sky-600 text-white hover:bg-sky-700 active:scale-95'
        }`}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
