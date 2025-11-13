import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = 'sm',
  ...props 
}) => {
  const baseClasses = 'bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-warm-200';
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  const shadows = {
    none: '',
    sm: 'shadow-lg',
    md: 'shadow-xl',
    lg: 'shadow-2xl',
  };
  
  const paddingClasses = paddings[padding] || paddings.md;
  const shadowClasses = shadows[shadow] || shadows.sm;
  
  return (
    <div
      className={`${baseClasses} ${paddingClasses} ${shadowClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;