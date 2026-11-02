import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
};

export function Button({
  variant = 'primary',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
