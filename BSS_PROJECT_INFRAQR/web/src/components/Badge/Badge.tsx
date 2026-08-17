import React from 'react';
import './Badge.css';

export type BadgeVariant = 'active' | 'inactive' | 'success' | 'danger' | 'warning' | 'qr' | 'primary';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  return (
    <span className={`ui-badge ui-badge--${variant} ${className}`}>
      {children}
    </span>
  );
};
