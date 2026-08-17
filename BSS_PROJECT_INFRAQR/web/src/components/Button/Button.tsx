import React from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      className={`ui-btn ui-btn--${variant} ${fullWidth ? 'ui-btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
};
