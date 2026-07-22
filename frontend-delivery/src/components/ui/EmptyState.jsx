// src/components/ui/EmptyState.jsx
// ⚡ Empty state elegante e reutilizável
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function EmptyState({
  icon,
  title = 'Nada por aqui ainda',
  description,
  action,
  compact = false,
  testId = 'empty-state'
}) {
  const Icon = icon || Sparkles;
  return (
    <div
      data-testid={testId}
      className={`w-full flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-6 font-theme animate-in fade-in`}
    >
      <div className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} rounded-full bg-primary/5 border border-primary/10 text-primary/70 flex items-center justify-center mb-4 shadow-sm relative`}>
        <Icon size={compact ? 24 : 36} strokeWidth={1.5} />
        <span className="absolute inset-0 rounded-full bg-primary/5 animate-ping opacity-30" />
      </div>
      <h3 className={`${compact ? 'text-base' : 'text-lg sm:text-xl'} font-black text-tx-main tracking-tight mb-2`}>{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-tx-muted max-w-md leading-relaxed font-medium">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
