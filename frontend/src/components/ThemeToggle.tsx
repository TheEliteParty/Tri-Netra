import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = true, className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 select-none group ${
        isDark
          ? 'bg-zinc-950/80 hover:bg-zinc-900 text-white border border-white/20 shadow-lg shadow-black/50 hover:border-white/40 hover:shadow-white/5'
          : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-sm hover:border-sky-300 hover:text-sky-700'
      } ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Glossy Dark Theme'}
      aria-label="Toggle Theme"
    >
      {/* Glossy top specular reflection line */}
      <span className="absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none rounded-t-xl" />

      {/* Icon with smooth flip animation */}
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" />
        )}
      </div>

      {showLabel && (
        <span className="flex items-center gap-1.5 text-[11px] tracking-wide font-medium">
          {isDark ? (
            <>
              <span className="text-white font-semibold">Glossy Dark</span>
              <Sparkles className="w-3 h-3 text-white/70 animate-pulse" />
            </>
          ) : (
            <span className="text-slate-700 font-semibold">Light</span>
          )}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
