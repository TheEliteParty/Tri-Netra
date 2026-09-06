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
    <div className={'inline-flex items-center p-1 bg-slate-100/90 border border-slate-200/60 rounded-xl gap-1 ' + className}>
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
          ? 'bg-white text-sky-700 font-semibold shadow-sm border border-slate-200/80'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
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
