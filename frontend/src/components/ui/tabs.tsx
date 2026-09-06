import * as React from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={'space-y-4 ' + className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={'inline-flex items-center p-1 bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/60 dark:border-white/10 rounded-xl gap-1 ' + className}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
  const isActive = ctx.value === value;
  return (
    <button
      type='button'
      onClick={() => ctx.onValueChange(value)}
      className={'inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all select-none ' + (
        isActive
          ? 'bg-white dark:bg-white text-slate-900 dark:text-black font-semibold shadow-sm border border-slate-200/80 dark:border-white'
          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
      ) + ' ' + className}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return <div className={'animate-fade-in ' + className}>{children}</div>;
}
