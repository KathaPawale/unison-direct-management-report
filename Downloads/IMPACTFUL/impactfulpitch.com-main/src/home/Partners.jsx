'use client';

import { useEffect, useState, useRef } from 'react';

// Import all partner logos
const importPartnerLogos = () => {
  const logos = [];
  for (let i = 1; i <= 17; i++) {
    const formattedNum = String(i).padStart(2, '0');
    logos.push(`/assets/partners/Partners-${formattedNum}.webp`);
  }
  return logos;
};

const partnerLogos = importPartnerLogos();

const LogoCard = ({ logo }) => {
  return (
    <div className='flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px]'>
      <img
        src={logo}
        alt='Client Logo'
        loading='lazy'
        className='h-16 sm:h-20 md:h-24 w-auto object-contain transition-all duration-300 hover:scale-110 hover:shadow-md filter'
        onError={(e) => {
          console.error(`Failed to load image: ${logo}`);
        }}
      />
    </div>
  );
};

const ScrollingRow = ({ logos, speed = 0.5 }) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const positionRef = useRef(0);
  const duplicatedLogosRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Duplicate the logos to create a seamless loop
    if (!duplicatedLogosRef.current) {
      const originalChildren = Array.from(container.children);
      originalChildren.forEach((child) => {
        const clone = child.cloneNode(true);
        container.appendChild(clone);
      });
      duplicatedLogosRef.current = true;
    }

    const logoWidth =
      window.innerWidth < 640
        ? 140 + 16
        : window.innerWidth < 768
          ? 180 + 24
          : 220 + 32; // card width + gap, responsive for different screen sizes
    const totalWidth = logos.length * logoWidth;

    // Create a smoother transition by using a different reset approach
    const animate = () => {
      if (!isPaused) {
        // Adjust speed based on screen size
        const adjustedSpeed = window.innerWidth < 640 ? speed * 0.7 : speed;
        positionRef.current -= adjustedSpeed;

        // Use a smoother reset approach
        if (positionRef.current <= -totalWidth) {
          // Reset position without visual jump
          positionRef.current += totalWidth;
        }

        // Apply transform with a slight transition for smoother movement
        container.style.transition = 'transform 0.05s linear';
        container.style.transform = `translateX(${positionRef.current}px)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [logos, speed, isPaused]);

  return (
    <div
      className='relative overflow-hidden w-full'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className='flex space-x-4 sm:space-x-6 md:space-x-8 py-2 sm:py-4'
      >
        {logos.map((logo, index) => (
          <LogoCard key={`${logo.name}-${index}`} logo={logo} />
        ))}
      </div>
    </div>
  );
};

export default function Partners() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className='py-10 sm:py-16 md:py-10 relative overflow-hidden bg-gradient-to-b from-gray-50/30 via-white to-white'
    >
      <div className='max-w-7xl mx-auto relative px-4 md:px-8'>
        {/* Header */}
        <div
          className={`
                    text-center mb-4 sm:mb-6 md:mb-10 transition-all duration-700 ease-out
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
        >
          <div className='inline-flex items-center justify-center px-3 sm:px-4 py-1 mb-2 sm:mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-xs sm:text-sm transform transition-transform duration-500 hover:scale-105'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4 mr-2 text-blue-500'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
              />
            </svg>
            <span className='font-medium text-blue-300'>Our Network</span>
          </div>
          <h2 className='text-2xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-4'>
            <span className='text-gray-900'>Ecosystem</span>{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Partners
            </span>
          </h2>
          <p className='text-gray-600 max-w-4xl mx-auto text-sm sm:text-base px-2 sm:px-0'>
            Collaborating with leading players in the startup ecosystem to
            provide comprehensive support and opportunities
          </p>
        </div>

        {/* Logo Carousel Container */}
        <div
          className={`
                    relative transition-all duration-700 ease-out delay-200
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
        >
          {/* Improved gradient overlays */}
          <div className='absolute inset-0 pointer-events-none z-10'>
            <div
              className='absolute left-0 top-0 bottom-0 w-12 sm:w-24 md:w-48 bg-gradient-to-r from-white to-transparent'
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, white, transparent)',
              }}
            />
            <div
              className='absolute right-0 top-0 bottom-0 w-12 sm:w-24 md:w-48 bg-gradient-to-l from-white to-transparent'
              style={{
                WebkitMaskImage: 'linear-gradient(to left, white, transparent)',
              }}
            />
          </div>

          {/* Logo rows with increased spacing */}
          <div className='py-2 sm:py-4 md:py-8'>
            <ScrollingRow logos={partnerLogos} speed={2.2} />
          </div>
        </div>
      </div>
    </section>
  );
}
