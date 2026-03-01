import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    compact?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', compact = false, ...rest }) => {
    return (
        <div className={`cv-card ${compact ? 'compact' : ''} ${className}`} {...rest}>
            {children}
        </div>
    );
};

export default Card;
