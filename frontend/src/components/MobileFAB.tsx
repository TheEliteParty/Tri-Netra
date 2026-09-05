import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Map, AlertTriangle, Plus, X, Radio } from 'lucide-react';
import { t } from '../i18n/translations';

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: Zap, label: t('simulateFab'), path: '/simulator', color: 'from-orange-500 to-red-500' },
    { icon: Map, label: t('riskMapFab'), path: '/map', color: 'from-blue-500 to-cyan-500' },
    { icon: AlertTriangle, label: t('alertsFab'), path: '/alerts', color: 'from-red-500 to-pink-500' },
    { icon: Radio, label: t('liveFab'), path: '/', color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="md:hidden fixed bottom-6 right-4 z-50">
      {/* Action buttons */}
      {open && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-scale-in">
          {actions.map((action, i) => (
            <button
              key={action.path}
              onClick={() => { navigate(action.path); setOpen(false); }}
              className="flex items-center gap-2 group"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-[10px] font-medium text-dark-300 bg-dark-800/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-dark-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg transform transition-transform active:scale-90`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
          open
            ? 'bg-dark-700 rotate-45'
            : 'bg-gradient-to-br from-green-500 to-emerald-600 animate-border-glow'
        }`}
        style={{
          boxShadow: open
            ? '0 0 20px rgba(51, 65, 85, 0.3)'
            : '0 0 30px rgba(34, 197, 94, 0.4), 0 10px 30px rgba(0,0,0,0.3)',
        }}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
