import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg bg-surface p-6 shadow-sm ring-1 ring-line ${className}`}
      {...rest}
    />
  );
}
