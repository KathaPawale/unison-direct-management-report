'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StyledButton from '../components/StyledButton';
// Asset paths for Next.js public folder
const Before1 = '/assets/before-after-slides/Before1.webp';
const After1 = '/assets/before-after-slides/After1.webp';
const Before2 = '/assets/before-after-slides/Before2.webp';
const After2 = '/assets/before-after-slides/After2.webp';
const Before3 = '/assets/before-after-slides/Before3.webp';
const After3 = '/assets/before-after-slides/After3.webp';
const Before4 = '/assets/before-after-slides/Before4.webp';
const After4 = '/assets/before-after-slides/After4.webp';
import AnimatedToggleSwitch from './components/AnimatedToggleSwitch';

// Import slide images (before and after versions)
const importSlideImages = () => {
  return [
    {
      id: 1,
      title: 'Executive Summary',
      description:
        'Clear, concise overview of your business that captures attention',
      before: Before1,
      after: After1,
    },
    {
      id: 2,
      title: 'Problem Statement',
      description:
        'Compelling presentation of the problem your solution addresses',
      before: Before2,
      after: After2,
    },
    {
      id: 3,
      title: 'Solution Slide',
      description: 'Showcasing your product/service as the ideal solution',
      before: Before3,
      after: After3,
    },
    {
      id: 4,
      title: 'Market Opportunity',
      description: 'Visual representation of your target market and potential',
      before: Before4,
      after: After4,
    },
    // {
    //   id: 5,
    //   title: 'Financial Projections',
    //   description: 'Clear, compelling presentation of your financial data',
    //   before: 'https://placehold.co/800x450/e2e8f0/475569?text=Before:+Financial+Projections',
    //   after: 'https://placehold.co/800x450/e0f2fe/0369a1?text=After:+Financial+Projections'
    // }
  ];
};

// Navigation Arrow Button Component
const ArrowButton = ({ direction, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 ${direction === 'left' ? 'left-2 md:left-4' : 'right-2 md:right-4'}
        z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 opacity-70 shadow-md backdrop-blur-sm
        transition-all duration-300 hover:bg-white hover:shadow-lg focus:outline-none
        ${disabled ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}
      aria-label={direction === 'left' ? 'Previous Slide' : 'Next Slide'}
      title={direction === 'left' ? 'Previous Slide' : 'Next Slide'}
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        className='h-5 w-5 text-gray-800'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
      >
        {direction === 'left' ? (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 19l-7-7 7-7'
          />
        ) : (
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 5l7 7-7 7'
          />
        )}
      </svg>
    </button>
  );
};

export default function BeforeAfterSlides() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAfterView, setIsAfterView] = useState(false);
  const [slideDirection, setSlideDirection] = useState(1); // 1 for next, -1 for prev

  const sectionRef = useRef(null);

  const slides = importSlideImages();
  const currentSlide = slides[currentSlideIndex];

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

  // Handle slide navigation
  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setSlideDirection(1); // Set direction for animation
      setCurrentSlideIndex(currentSlideIndex + 1);
      setIsAfterView(false);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      setSlideDirection(-1); // Set direction for animation
      setCurrentSlideIndex(currentSlideIndex - 1);
      setIsAfterView(false);
    }
  };

  // Toggle between before and after views
  const toggleView = () => {
    setSlideDirection(isAfterView ? -1 : 1); // Set direction based on toggle
    setIsAfterView(!isAfterView);
  };

  // DEFINE VARIANTS: Create animation variants for the slide transition
  const slideVariants = {
    hidden: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    visible: {
      x: '0%',
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
    exit: (direction) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      transition: { duration: 0.6, ease: 'easeIn' },
    }),
  };

  return (
    <section
      ref={sectionRef}
      className='py-8 px-4 md:px-8 relative overflow-hidden bg-gradient-to-b from-white via-gray-50/30 to-white'
    >
      <div className='max-w-7xl mx-auto relative z-10'>
        {/* Section Header */}
        <div
          className={`text-center mb-6 md:mb-8 transition-all duration-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className='inline-flex items-center justify-center px-3 sm:px-4 py-1 mb-3 sm:mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-xs sm:text-sm transform transition-transform duration-500 hover:scale-105'>
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
                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
              />
            </svg>
            <span className='font-medium text-blue-300'>
              Transformation Showcase
            </span>
          </div>
          <h2
            className={`text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 transition-all duration-700 delay-200 text-gray-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            The{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Impactful Difference
            </span>
          </h2>
          <p
            className={`text-gray-600 max-w-3xl mx-auto mb-4 md:mb-6 px-2 sm:px-0 text-sm sm:text-base transition-all duration-800 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            See how we transform ordinary pitch decks into compelling visual
            stories that captivate investors
          </p>

          {/* Toggle Switch */}
          <AnimatedToggleSwitch
            isChecked={isAfterView}
            onToggle={toggleView}
            size={27}
            className={`mx-auto transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          />
        </div>

        {/* Slides Display */}
        <div
          className={`relative max-w-4xl mx-auto transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          {/* Navigation Arrows */}
          <ArrowButton
            direction='left'
            onClick={goToPrevSlide}
            disabled={currentSlideIndex === 0}
          />
          <ArrowButton
            direction='right'
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
          />

          {/* Slide Content */}
          <div className='relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl'>
            {/* Slide Image */}
            <div className='relative w-full aspect-video'>
              {/* 3. WRAP: Use AnimatePresence to manage entering and exiting animations */}
              <AnimatePresence initial={false} custom={slideDirection}>
                <motion.img
                  // Use a unique key that changes when the view or slide changes
                  key={currentSlideIndex + (isAfterView ? '_after' : '_before')}
                  // Use the correct image source
                  src={isAfterView ? currentSlide.after : currentSlide.before}
                  // Apply the variants
                  variants={slideVariants}
                  custom={slideDirection}
                  initial='hidden'
                  animate='visible'
                  exit='exit'
                  // Standard image classes
                  className='absolute inset-0 w-full h-full object-cover'
                  alt={`${currentSlide.title} - ${isAfterView ? 'After' : 'Before'}`}
                  loading='lazy'
                />
              </AnimatePresence>
            </div>

            {/* Before/After Badge */}
            <div
              className='absolute top-2 md:top-4 right-2 md:right-4 bg-gray-800/80 opacity-60 text-white px-2 sm:px-3 md:px-4 py-1 md:py-2 rounded-full backdrop-blur-sm text-xs md:text-sm font-medium cursor-pointer'
              onClick={toggleView}
            >
              {isAfterView ? 'After' : 'Before'}
            </div>
          </div>

          {/* Slide Indicators */}
          <div className='flex justify-center mt-3 sm:mt-4 md:mt-6 space-x-1 sm:space-x-2'>
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setTimeout(() => {
                    setCurrentSlideIndex(index);
                    setIsAfterView(false); // Reset to 'Before' state
                  }, 300);
                }}
                className={`w-1.5 sm:w-2 md:w-3 h-1.5 sm:h-2 md:h-3 rounded-full transition-all duration-300 ${index === currentSlideIndex ? 'bg-blue-500 w-3 sm:w-4 md:w-6' : 'bg-gray-300 hover:bg-gray-400'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div
          className={`mt-8 sm:mt-12 md:mt-16 text-center transition-all duration-800 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <h3 className='text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 text-gray-900'>
            Ready to transform your pitch deck?
          </h3>
          <p className='text-gray-600 max-w-3xl mx-auto mb-4 sm:mb-6 md:mb-8 px-4 text-sm sm:text-base'>
            Let our expert team helps you to create a pitch deck that stands out
            and gets better results
          </p>
          <div className='flex'>
            <StyledButton to='/services' size='lg' className='max-w-sm mx-auto'>
              Explore Our Services
            </StyledButton>
          </div>
        </div>
      </div>
    </section>
  );
}
