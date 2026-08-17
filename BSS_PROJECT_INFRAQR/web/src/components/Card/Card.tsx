import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, hoverable = false, className = '', ...props }) => {
  return (
    <div className={`ui-card ${hoverable ? 'ui-card--hoverable' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
};
