// src/components/ui/StatCard.jsx
// ⚡ Card de métrica com valor grande + sparkline opcional + comparativo
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/** Mini sparkline SVG feita à mão (~50 linhas, sem dep externa) */
export function Sparkline({ data = [], width = 120, height = 32, color = 'var(--color-primary)', fill = true }) {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const { path, area, min, max } = useMemo(() => {
    const values = data.map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = width / (values.length - 1);
    const pts = values.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area = path + ` L ${width} ${height} L 0 ${height} Z`;
    return { path, area, min, max };
  }, [data, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && <path d={area} fill={color} fillOpacity="0.12" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={((data[data.length - 1] - min) / (max - min || 1)) * (height - 4) * -1 + (height - 2)} r="3" fill={color} />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  prefix,
  suffix,
  icon,
  trend,          // ex.: +18 (% comparado ao período anterior)
  trendLabel = 'vs anterior',
  sparkline,      // array de números
  color = 'primary', // 'primary' | 'success' | 'info' | 'warning' | 'danger'
  onClick,
  testId,
  className = ''
}) {
  const trendUp = typeof trend === 'number' && trend > 0.5;
  const trendDown = typeof trend === 'number' && trend < -0.5;
  const trendFlat = typeof trend === 'number' && !trendUp && !trendDown;

  const trendCls = trendUp
    ? 'text-emerald-500 bg-emerald-500/10'
    : trendDown
      ? 'text-red-500 bg-red-500/10'
      : 'text-tx-muted bg-bg-input';

  const TrendIcon = trendUp ? TrendingUp : trendDown ? TrendingDown : Minus;

  const colorMap = {
    primary: 'text-primary',
    success: 'text-emerald-500',
    info: 'text-sky-500',
    warning: 'text-amber-500',
    danger: 'text-red-500'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      data-testid={testId}
      className={`text-left w-full p-5 sm:p-6 rounded-card bg-bg-surface border border-stroke shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300 group ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'} ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-tx-muted mb-1 truncate">{label}</p>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-theme bg-bg-input border border-stroke flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.primary} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-black text-tx-main tracking-tight leading-none pop-in">
            {prefix && <span className="text-tx-muted text-lg mr-1">{prefix}</span>}
            {value}
            {suffix && <span className="text-tx-muted text-lg ml-1">{suffix}</span>}
          </p>
          {typeof trend === 'number' && (
            <div className={`inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-theme text-[10px] font-black uppercase tracking-widest ${trendCls}`}>
              <TrendIcon size={12} />
              {trend > 0 ? '+' : ''}{Number(trend).toFixed(1)}%
              <span className="opacity-70 ml-1 hidden sm:inline">{trendLabel}</span>
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="shrink-0 opacity-90">
            <Sparkline data={sparkline} width={100} height={36} color={`var(--color-${color === 'primary' ? 'primary' : 'primary'})`} />
          </div>
        )}
      </div>
    </button>
  );
}
