import React, { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';

  const variants = {
    primary:
      'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white focus:ring-teal-500 shadow-md shadow-teal-500/25 hover:shadow-lg hover:shadow-teal-500/30 active:scale-[0.98] border border-teal-400/20',
    secondary:
      'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 focus:ring-slate-400 active:scale-[0.98] border border-slate-200/90 shadow-xs hover:border-slate-300',
    outline:
      'border border-slate-300/90 hover:border-teal-500 text-slate-700 hover:text-teal-700 bg-white hover:bg-teal-50/40 focus:ring-teal-500 active:scale-[0.98] shadow-xs',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 focus:ring-slate-300 active:scale-[0.98]',
    danger:
      'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white focus:ring-rose-500 shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/30 active:scale-[0.98]',
    glass:
      'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md focus:ring-white/50 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 font-medium',
    md: 'text-sm px-4 py-2 gap-2 font-medium',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
      )}
    </button>
  );
};
