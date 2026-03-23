import { ReactNode } from 'react';

// Common component props
export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

// Link props for navigation
export interface LinkProps extends BaseProps {
  href?: string;
  to?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
}

// Button variants and sizes
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Form types
export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  services: string[];
}

// Service card types
export interface ServiceCard {
  icon: ReactNode;
  title: string;
  description: string;
}

// Testimonial types
export interface Testimonial {
  name: string;
  company: string;
  message: string;
  image: string;
  rating?: number;
}

// Success story types
export interface SuccessStory {
  image: string;
  title: string;
  description: string;
  link?: string;
}

// Logo types
export interface Logo {
  src: string;
  alt: string;
  name?: string;
}

// Animation types
export interface AnimationProps {
  duration?: number;
  delay?: number;
  ease?: string;
}

// Mouse event types
export interface MousePosition {
  x: number;
  y: number;
}

export interface PointerEvent extends MousePosition {
  id: number;
  down: boolean;
  moved: boolean;
  color: {
    r: number;
    g: number;
    b: number;
  };
}
