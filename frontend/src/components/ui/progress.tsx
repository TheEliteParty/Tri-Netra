import * as React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

export function Progress({ value = 0, max = 100, className = '', indicatorClassName = 'bg-sky-500', ...props }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={'relative h-2 w-full overflow-hidden rounded-full bg-slate-100 ' + className} {...props}>
      <div
        className={'h-full w-full flex-1 transition-all duration-500 rounded-full ' + indicatorClassName}
        style={{ transform: 'translateX(-' + (100 - percentage) + '%)' }}
      />
    </div>
  );
}
