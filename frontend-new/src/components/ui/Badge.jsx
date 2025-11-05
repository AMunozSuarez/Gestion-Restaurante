import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variants = {
    default: 'bg-warm-100 text-warm-800 border border-warm-200',
    primary: 'bg-sage-100 text-sage-800 border border-sage-200',
    secondary: 'bg-coffee-100 text-coffee-800 border border-coffee-200',
    success: 'bg-sage-100 text-sage-800 border border-sage-200',
    warning: 'bg-warm-100 text-warm-800 border border-warm-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    pending: 'bg-warm-100 text-warm-800 border border-warm-200',
    preparing: 'bg-terracotta-100 text-terracotta-800 border border-terracotta-200',
    completed: 'bg-sage-100 text-sage-800 border border-sage-200',
    cancelled: 'bg-red-100 text-red-800 border border-red-200',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  const variantClasses = variants[variant] || variants.default;
  const sizeClasses = sizes[size] || sizes.md;
  
  return (
    <span
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;