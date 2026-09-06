import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'ghost' | 'interactive';
}

export function Card({ className = '', variant = 'default', ...props }: CardProps) {
  const base = 'rounded-2xl transition-all duration-200 ';
  const variants = {
    default: 'bg-white border border-slate-900 shadow-card hover:shadow-card-hover hover:border-black ',
    ghost: 'bg-slate-50/50 border border-slate-900/40 ',
    interactive: 'bg-white border border-slate-900 shadow-card hover:shadow-card-hover hover:border-black hover:-translate-y-0.5 cursor-pointer ',
  };
  return <div className={base + variants[variant] + className} {...props} />;
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={'flex flex-col space-y-1.5 p-5 sm:p-6 ' + className} {...props} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={'font-semibold text-slate-900 leading-none tracking-tight ' + className} {...props} />;
}

export function CardDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={'text-xs text-slate-500 ' + className} {...props} />;
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={'p-5 sm:p-6 pt-0 ' + className} {...props} />;
}

export function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={'flex items-center p-5 sm:p-6 pt-0 border-t border-slate-100 ' + className} {...props} />;
}
