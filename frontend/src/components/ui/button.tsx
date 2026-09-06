import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'sky' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export function Button({ className = '', variant = 'default', size = 'md', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] ';
  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5 ',
    md: 'h-9 px-4 text-xs sm:text-sm gap-2 ',
    lg: 'h-11 px-6 text-sm sm:text-base gap-2.5 ',
    icon: 'h-9 w-9 p-0 ',
  };
  const variants = {
    default: 'bg-sky-600 dark:bg-white text-white dark:text-black hover:bg-sky-700 dark:hover:bg-zinc-200 shadow-sm hover:shadow ',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200/80 hover:bg-sky-100 dark:bg-zinc-900/90 dark:text-sky-300 dark:border-white/10 dark:hover:bg-zinc-800 ',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:border dark:border-white/10 ',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm dark:border-white/15 dark:bg-zinc-950/80 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:border-white/30 ',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-900/80 ',
    destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm dark:bg-rose-600 dark:text-white ',
  };
  return <button className={base + sizes[size] + variants[variant] + className} disabled={disabled} {...props} />;
}
