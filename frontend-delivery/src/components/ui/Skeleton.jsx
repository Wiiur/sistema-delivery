// src/components/ui/Skeleton.jsx
// ⚡ Skeleton loader — respeitando o tema
import React from 'react';

export function Skeleton({ className = '', rounded = 'rounded-theme' }) {
  return (
    <div
      className={`bg-bg-input ${rounded} animate-pulse ${className}`}
      style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite linear' }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ lines = 3, testId }) {
  return (
    <div data-testid={testId} className="p-4 bg-bg-surface border border-stroke rounded-card shadow-sm space-y-3">
      <Skeleton className="h-4 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-1/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, columns = 'md:grid-cols-2 lg:grid-cols-3', testId = 'skeleton-grid' }) {
  return (
    <div data-testid={testId} className={`grid grid-cols-1 ${columns} gap-4`}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} lines={i % 2 ? 3 : 2} />)}
    </div>
  );
}

export function SkeletonRow({ testId }) {
  return (
    <div data-testid={testId} className="flex items-center gap-4 p-4 bg-bg-surface border border-stroke rounded-theme">
      <Skeleton className="w-12 h-12" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}
