import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className = '', type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={'flex h-10 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 dark:focus:border-white focus:ring-2 focus:ring-sky-100 dark:focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all ' + className}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';
