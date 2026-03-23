'use client';

import CountUp from 'react-countup';
import { useEffect, useState, useRef } from 'react';
import SpotlightCard from '../components/SpotlightCard';

export default function Metrics() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
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

  // Metrics data array
  const metrics = [
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2'
          />
        </svg>
      ),
      label: 'Pitch Decks Created',
      value: '3000',
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
          />
        </svg>
      ),
      label: 'Startups Assisted',
      value: '7000',
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
          />
        </svg>
      ),
      label: 'Pitch Decks Reviewed',
      value: '10000',
    },
  ];

  return (
    <section className='py-4 sm:py-12 px-4 sm:px-8 relative overflow-hidden'>
      <div className='max-w-7xl mx-auto'>
        <SpotlightCard
          className='bg-gray-950 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden shadow-xl'
          spotlightColor='rgba(245, 210, 255, 0.18)'
        >
          {/* Gradient overlay for added depth */}
          <div className='absolute inset-0 bg-gradient-to-br from-blue-900/10 via-indigo-900/10 to-purple-900/10'></div>

          <div className='relative z-10'>
            <div className='flex flex-col md:flex-row justify-between mb-4 sm:mb-6 md:mb-8'>
              <div className='md:w-1/2'>
                <button
                  disabled
                  className='bg-gray-800 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-300 flex items-center mb-4 sm:mb-6'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-5 w-5 mr-2'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                    />
                  </svg>
                  Statistics
                </button>
                <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 md:mb-8'>
                  Our Impactful Metrics
                </h2>
              </div>
              <div className='md:w-1/2 md:pl-8'>
                <p className='text-gray-300 text-base sm:text-lg mb-3 sm:mb-4'>
                  From ideas to results: the story of our startup collaboration
                  journey — filled with vision, validation and progress, shaping
                  tomorrow’s innovations
                </p>
              </div>
            </div>
            <div
              ref={sectionRef}
              className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 rounded-xl'
            >
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className='flex flex-col items-center p-3 sm:p-4 md:p-6 text-center'
                >
                  <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-full flex items-center justify-center mb-2 sm:mb-4'>
                    <span className='text-gray-300'>{metric.icon}</span>
                  </div>
                  <p className='text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2'>
                    {metric.label}
                  </p>
                  <p className='text-xl sm:text-2xl md:text-3xl font-bold'>
                    {isVisible && (
                      <CountUp
                        scrollSpyOnce
                        start={0}
                        end={metric.value}
                        duration={3}
                        delay={0}
                      />
                    )}
                    +
                  </p>
                </div>
              ))}
              <div className='flex flex-col items-center p-3 sm:p-4 md:p-6 text-center'>
                <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-full flex items-center justify-center mb-2 sm:mb-4'>
                  <span className='text-gray-300'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                  </span>
                </div>
                <p className='text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2'>
                  Funds Raised
                </p>
                <p className='text-xl sm:text-2xl md:text-3xl font-bold'>
                  USD 1 Billion+
                </p>
              </div>
            </div>
            <p className='text-gray-400 italic md:-mr-6 absolute right-0 text-[11px] items-center'>
              and Constantly Expanding
              {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg> */}
            </p>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
}
