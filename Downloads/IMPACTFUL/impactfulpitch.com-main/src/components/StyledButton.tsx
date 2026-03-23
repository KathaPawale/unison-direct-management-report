'use client';

import React, { ReactNode, MouseEvent } from 'react';
import Link from 'next/link';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'dark'
  | 'light'
  | 'custom';
type ButtonSize = 'sm' | 'md' | 'lg';

interface StyledButtonProps {
  to?: string;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  className?: string;
  [key: string]: unknown;
}

/**
 * StyledButton - A reusable button component with consistent styling and hover effects
 */
export default function StyledButton({
  to,
  href,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  onClick,
  className = '',
  ...props
}: StyledButtonProps) {
  // Base styles for all buttons
  const baseStyles =
    'group relative rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center font-medium';

  // Size variations
  const sizeStyles = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  };

  // Variant specific styles (border, text color)
  // Primary variant text color is white by default, purple on hover
  const variantStyles = {
    primary:
      'border border-transparent hover:shadow-lg text-white hover:border-blue-500 hover:text-purple-900',
    secondary:
      'border border-gray-300 hover:border-blue-500 hover:text-blue-700 text-gray-700',
    outline:
      'border border-gray-300 hover:border-blue-500 hover:text-blue-700 text-gray-700',
    ghost: 'hover:text-blue-700 text-gray-600',
    dark: 'border border-gray-700 hover:border-blue-500 hover:text-white text-gray-200',
    light:
      'border border-white/20 hover:border-white hover:text-white text-white/90',
    custom:
      'border border-blue-500 hover:border-blue-500 hover:text-blue-700 text-white bg-gradient-to-r from-gray-900 to-indigo-900',
  };

  // Background gradient variations
  const gradientStyles = {
    primary: 'bg-gradient-to-r from-violet-500 to-blue-500',
    secondary: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    outline: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    ghost: 'bg-gradient-to-r from-gray-50 to-gray-100',
    dark: 'bg-gradient-to-r from-gray-900 to-indigo-900',
    light: 'bg-gradient-to-r from-white/90 to-blue-50',
    custom: 'bg-gradient-to-r from-blue-50 to-indigo-50',
  };

  // Full width style
  const widthStyle = fullWidth ? 'w-full' : '';

  // Combine all styles
  const buttonStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`;

  // Common button content with the hover effect
  const buttonContent = (
    <>
      {/* Gradient background: slides in on hover for most, always visible for primary */}
      <span
        className={`absolute inset-0 w-full h-full ${
          gradientStyles[variant]
        } transform transition-transform duration-300 ${
          variant === 'primary'
            ? 'scale-x-100 group-hover:scale-x-0 origin-right'
            : 'scale-x-0 group-hover:scale-x-100 origin-left'
        }`}
      ></span>

      {/* Button content */}
      <span className='relative z-10 flex items-center'>
        {children}

        {/* Show arrow if no custom children with specific icon were provided */}
        {typeof children === 'string' && (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-4 w-4 ml-2 transform transition-transform duration-300 group-hover:translate-x-1'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
              clipRule='evenodd'
            />
          </svg>
        )}
      </span>
    </>
  );

  // Return appropriate element based on props
  if (to) {
    return (
      <Link href={to} className={buttonStyles} onClick={onClick} {...props}>
        {buttonContent}
      </Link>
    );
  } else if (href) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className={buttonStyles}
        onClick={onClick}
        {...props}
      >
        {buttonContent}
      </a>
    );
  } else {
    return (
      <button
        type={type}
        className={buttonStyles}
        onClick={onClick as (event: MouseEvent<HTMLButtonElement>) => void}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
}
