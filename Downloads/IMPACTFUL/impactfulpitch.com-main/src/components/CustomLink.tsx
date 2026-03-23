'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, MouseEvent } from 'react';

interface CustomLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: unknown;
}

/**
 * This is our smart link component. It does one thing:
 * It checks if you are already on the page you're trying to navigate to.
 * - If YES, it prevents the navigation and smoothly scrolls to the top.
 * - If NO, it acts exactly like a normal Link.
 */
export default function CustomLink({
  to,
  children,
  onClick,
  ...props
}: CustomLinkProps) {
  const pathname = usePathname();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Check if the link's destination is the same as the current page's path
    if (pathname === to) {
      e.preventDefault(); // Stop Next.js from doing anything
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Manually scroll to top
    }

    // This is important for your mobile menu!
    // If an `onClick` function was passed in props, we still call it.
    if (onClick) {
      onClick(e);
    }
  };

  // We render a REAL <Link> component to get all its benefits (like accessibility)
  // We pass all the props {...props} and add our custom onClick logic.
  return (
    <Link href={to} {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
