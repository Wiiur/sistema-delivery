// src/components/ui/Button.jsx
// ⚡ Botão padrão com variants, tamanhos, loading state e microinteração
import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:   'bg-primary text-tx-primary hover:bg-primary-hover shadow-theme',
  secondary: 'bg-bg-input text-tx-main border border-stroke hover:border-primary hover:text-primary',
  ghost:     'bg-transparent text-tx-muted hover:bg-bg-input hover:text-tx-main',
  danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  success:   'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
  outline:   'bg-transparent border border-primary/40 text-primary hover:bg-primary/5'
};

const SIZES = {
  xs: 'text-[11px] px-2.5 py-1.5 gap-1',
  sm: 'text-xs px-3 py-2 gap-1.5',
  md: 'text-sm px-5 py-3 gap-2',
  lg: 'text-sm px-6 py-4 gap-2 sm:text-base',
  xl: 'text-base px-7 py-5 gap-2.5'
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  iconRight,
  children,
  className = '',
  fullWidth,
  ...rest
}) {
  const cls =
    'font-black uppercase tracking-widest inline-flex items-center justify-center rounded-theme ' +
    'transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
    VARIANTS[variant] + ' ' + SIZES[size] + (fullWidth ? ' w-full' : '') + ' ' + className;

  return (
    <button {...rest} disabled={disabled || loading} className={cls}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
}
