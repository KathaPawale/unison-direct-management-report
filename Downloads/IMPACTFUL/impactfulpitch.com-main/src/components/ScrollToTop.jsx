'use client';
'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollToTop component provides a floating button that appears when user scrolls down
 * and allows them to manually scroll back to the top
 */
export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const pathname = usePathname();
  // Use a ref to store the pathname from the previous render.
  // This is the key to detecting a true navigation vs. a reload.
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    setHasUserScrolled(false);
    setIsVisible(false);
    mountTimeRef.current = Date.now();

    // Compare the current pathname with the one we stored in the ref.
    if (prevPathnameRef.current !== pathname) {
      // If they are different, it means the user has NAVIGATED to a new page.
      window.scrollTo(0, 0);
    }

    // After every render, update the ref to store the current pathname
    // for the next comparison. This is crucial.
    prevPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const timeSinceMount = Date.now() - mountTimeRef.current;
      if (timeSinceMount < 500) {
        return;
      }

      if (!hasUserScrolled) {
        setHasUserScrolled(true);
      }

      const scrolled = window.scrollY > 300;
      setIsVisible(scrolled && hasUserScrolled);
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasUserScrolled]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 bg-gradient-to-r from-blue-500 to-violet-600 text-white rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 ease-in-out cursor-pointer ${
        isVisible
          ? 'opacity-80 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95'
      } hover:scale-110 hover:from-blue-600 hover:to-violet-700 group`}
      aria-label='Scroll to top'
      title='Scroll to top'
    >
      {/* Arrow Up Icon */}
      <svg
        className='w-5 h-5 transform transition-transform duration-300 group-hover:-translate-y-0.5'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2.5}
          d='M5 15l7-7 7 7'
        />
      </svg>

      {/* Subtle glow effect */}
      <div className='absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-300 -z-10'></div>
    </button>
  );
}
