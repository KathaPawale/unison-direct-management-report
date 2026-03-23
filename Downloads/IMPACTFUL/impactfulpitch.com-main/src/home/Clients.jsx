'use client';

import { useState, useRef, useEffect } from 'react';

// Import all Client logos
const importClientLogos = () => {
  const logos = [];

  for (let i = 1; i <= 50; i++) {
    const formattedNum = String(i).padStart(2, '0');
    logos.push(`/assets/clients/Our Client logos-${formattedNum}.webp`);
  }
  return logos;
};

const clientLogos = importClientLogos();

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

const ScrollingRow = ({ logos, speed = 0.3 }) => {
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
          ? 160 + 24
          : 180 + 32; // card width + gap, responsive for different screen sizes
    const totalWidth = logos.length * logoWidth;

    // Create a smoother transition by using a different reset approach
    const animate = () => {
      if (!isPaused) {
        positionRef.current -= speed;

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
          <LogoCard key={`${index}`} logo={logo} />
        ))}
      </div>
    </div>
  );
};

export default function Clients() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className='px-4 sm:px-8 relative py-6 bg-white'>
      <div className='max-w-7xl mx-auto relative z-10 flex flex-col justify-center'>
        {/* Section Header */}
        <div
          className={`
          text-center pb-1 sm:pb-3 transition-all duration-700 ease-out
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
                d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
              />
            </svg>
            <span className='font-medium text-blue-300'>Our Clientele</span>
          </div>
          <h2 className='text-2xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-4 text-gray-900'>
            From{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Idea to IPO
            </span>
          </h2>
          <p className='text-gray-600 max-w-3xl mx-auto text-sm sm:text-base px-2 sm:px-0'>
            Our diverse portfolio reflects expertise across every stage &
            industry
          </p>
        </div>

        {/* Logos Grid */}
        <div
          className={`
          mb-2 relative transition-all duration-700 ease-out delay-200
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
          <div className='space-y-6 sm:space-y-8 md:space-y-10 py-2'>
            <ScrollingRow
              logos={clientLogos.slice(0, Math.ceil(clientLogos.length / 2))}
              speed={2.5}
            />
            <ScrollingRow
              logos={clientLogos.slice(Math.ceil(clientLogos.length / 2))}
              speed={2.2}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
