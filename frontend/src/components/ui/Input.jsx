import React from 'react';

const Input = React.forwardRef(({ 
  label,
  error,
  className = '',
  type = 'text',
  ...props 
}, ref) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500';
  const errorClasses = error ? 'border-red-500' : 'border-gray-300';
  
  const handlePointerDown = (e) => {
    if (e.currentTarget !== document.activeElement) {
      e.currentTarget.focus();
    }
    props.onPointerDown?.(e);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-brown-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`${baseClasses} ${errorClasses} ${className}`}
        onPointerDown={handlePointerDown}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;