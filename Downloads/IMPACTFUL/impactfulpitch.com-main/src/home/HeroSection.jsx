'use client';

import { useState, useEffect, useRef } from 'react';
import StyledButton from '../components/StyledButton';
import StartupJourneyVisualization from './components/HeroComponent.jsx';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Animation to reveal content when section comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
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
    <section
      ref={sectionRef}
      className='pt-16 sm:pt-20 sm:px-6 relative overflow-hidden bg-white'
    >
      <div className='max-w-7xl px-5 sm:px-1 mx-auto relative z-10'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2 w-full'>
          <div className='relative z-10 flex flex-col justify-center items-center text-center md:items-start md:text-left'>
            <h1
              className={`text-[22px] sm:text-[29px] sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6 transition-all duration-600 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              Impactful Acceleration&nbsp;
              <br className='hidden sm:block' />
              for your&nbsp;
              <br className='hidden sm:block' />
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
                Fund Raising Needs
              </span>
            </h1>
            <h1 className='hidden'>Impactful Pitch</h1>

            <p
              className={`text-sm sm:text-lg text-gray-700 mb-6 sm:mb-8 pr-2 max-w-lg transition-all duration-600 delay-100 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              From pitch decks to investor connections,
              <span className='text-gray-500'>
                {' '}
                we provide end-to-end support, ensuring your story captivates
                investors and secures funding customized to your needs.
              </span>
            </p>

            <div
              className={`mb-3 sm:mb-4 transition-all duration-600 delay-200 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              <div className='flex items-center'>
                <StyledButton
                  href='https://calendly.com/teamnikhilparmar/20min?back=1'
                  size='lg'
                >
                  Schedule a Call
                </StyledButton>
              </div>
            </div>
          </div>

          {/* Right Section - Startup Journey Visualization */}
          <div className='relative z-0 mx-auto mb-4 md:my-auto'>
            <StartupJourneyVisualization
              className=''
              accentColor='#0000FF'
              stageLabels={{
                idea: 'Idea',
                seed: 'Seed',
                series: 'Series',
                ipo: 'IPO',
              }}
              milestoneTexts={{
                vision: 'Vision Clarified',
                strategy: 'Strategy Aligned',
                capital: 'Capital Secured',
                growth: 'Growth Accelerated',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
