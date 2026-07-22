// src/components/ui/Badge.jsx
// ⚡ Badge de status — cores contextuais com bom contraste
import React from 'react';

const TONES = {
  neutral:  'bg-bg-input text-tx-muted border-stroke',
  primary:  'bg-primary/10 text-primary border-primary/20',
  success:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  danger:   'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  info:     'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  purple:   'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
};

export default function Badge({ tone = 'neutral', icon, children, dot, className = '', testId }) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-theme text-[11px] font-black uppercase tracking-widest border ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${dot === 'pulse' ? 'animate-pulse' : ''}`} />}
      {icon}
      {children}
    </span>
  );
}

/** Mapeamento comum dos status de pedido -> tone do Badge */
export function tomStatusPedido(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'recebido') return 'info';
  if (s === 'em_preparo') return 'warning';
  if (s === 'saiu_entrega' || s === 'em_consumo') return 'purple';
  if (s === 'entregue') return 'success';
  if (s === 'cancelado') return 'danger';
  return 'neutral';
}
