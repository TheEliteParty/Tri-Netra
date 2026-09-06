import * as React from 'react';

export function Separator({ className = '', orientation = 'horizontal' }: { className?: string; orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      className={'shrink-0 bg-slate-200/80 ' + (
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
      ) + ' ' + className}
    />
  );
}
