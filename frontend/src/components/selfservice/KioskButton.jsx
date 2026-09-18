import React from 'react';

/**
 * Botón táctil del kiosco. No se reutiliza el Button de components/ui porque ese está
 * pensado para densidad de escritorio (con mouse); aquí el objetivo mínimo es de 64px para
 * que se pueda presionar con el dedo sin apuntar.
 */

const VARIANTS = {
  primary: 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-lg shadow-orange-600/20',
  secondary: 'bg-white text-gray-900 border-2 border-gray-300 hover:border-gray-400 active:bg-gray-100',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
};

const SIZES = {
  md: 'min-h-[56px] px-6 text-lg',
  lg: 'min-h-[72px] px-8 text-xl',
  xl: 'min-h-[88px] px-10 text-2xl',
};

const KioskButton = ({
  children,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  disabled = false,
  className = '',
  ...props
}) => (
  <button
    type="button"
    disabled={disabled}
    className={[
      'inline-flex items-center justify-center gap-3 rounded-2xl font-semibold',
      'transition-colors duration-150 select-none',
      'focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/50',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      VARIANTS[variant] || VARIANTS.primary,
      SIZES[size] || SIZES.lg,
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
);

export default KioskButton;
