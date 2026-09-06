import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'sky' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md';
}

export function Badge({ className = '', variant = 'default', size = 'sm', ...props }: BadgeProps) {
  const base = 'inline-flex items-center font-medium rounded-full transition-colors leading-none whitespace-nowrap shrink-0 select-none ';
  const sizes = {
    sm: 'px-2 py-0.5 text-[11px] ',
    md: 'px-2.5 py-1 text-xs ',
  };
  const variants = {
    default: 'bg-sky-600 text-white shadow-sm ',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 ',
    outline: 'border border-slate-200 text-slate-700 bg-white ',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200/80 ',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 ',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80 ',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200/80 ',
  };
  return <div className={base + sizes[size] + variants[variant] + className} {...props} />;
}
