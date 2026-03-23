'use client';

import { useState, useEffect, useRef } from 'react';
import StyledButton from '../components/StyledButton';

// Import all media logos
const importMediaLogos = () => {
  const logos = [];

  for (let i = 1; i <= 14; i++) {
    const formattedNum = String(i).padStart(2, '0');
    logos.push(`/assets/media/Media_${formattedNum}.webp`);
  }
  return logos;
};

const allLogoPaths = importMediaLogos();

const mediaLinks = [
  'https://www.livemint.com/brand-stories/coworking-marketplace-stylework-raises-usd-2-mn-at-a-usd-20-mn-valued-deal-11680774279840.html',
  'https://inc42.com/buzz/coworking-startup-stylework-secures-funding-to-help-companies-save-costs/',
  'https://startupstorymedia.com/insights-stylework-raises-2-million-in-series-a1-funding-round-to-develop-and-expand-its-co-working-marketplace-technology-for-corporates',
  'https://startup.outlookindia.com/sector/e-commerce/co-working-marketplace-stylework-raises-2-million-news-8028',
  'https://www.indianweb2.com/2023/04/coworking-marketplace-stylework-raises.html?m=1',
  'https://entrackr.com/2023/04/coworking-marketplace-stylework-raises-2-mn-in-series-a1-round',
  'https://www.news18.com/business/markets/coworking-marketplace-stylework-raises-2-million-from-qi-ventures-we-founder-circle-and-others-7510723.html',
  'https://www.apnnews.com/coworking-marketplace-stylework-raises-usd-2-mn-at-a-usd-20-mn-valued-deal-from-qi-ventures-we-founder-circle-and-others/',
  'https://www.tice.news/tice-dispatch/startup-club-india-tice/from-vision-to-venture-how-impactful-pitch-is-helping-startups-raise-millions-8838236',
  'https://yourstory.com/2024/09/indias-entrepreneurial-ecosystem',
  'https://www.linkedin.com/posts/nutgraf-pr-and-media-advisory_venturecapital-angelinvestors-startupsuccess-activity-7208401366933786624-B5FM?utm_source=share&utm_medium=member_desktop',
  'https://sugermint.com/nikhil-parmar/',
  'https://entrepreneurstoday.in/revolutionizing-startup-funding-with-generative-ai-meet-nikhil-parmar-founder-of-impactful-pitch/',
  'https://www.financialexpress.com/business/industry-start-ups-come-of-age-as-dead-pool-slumps-75-3446737/',
];

// Clean, professional media data with actual logos
const mediaLogos = allLogoPaths.map((logoPath, i) => ({
  name: `Media ${i + 1}`,
  displayName: `Media ${i + 1}`,
  image: logoPath, // Correctly assigns the image path
  link: mediaLinks[i], // Correctly assigns the corresponding link
}));

const LogoCard = ({ logo }) => {
  return (
    <div className='flex-shrink-0 w-[140px] sm:w-[180px]'>
      <a
        href={logo.link}
        target='_blank'
        rel='noopener noreferrer'
        className='block group'
      >
        <img
          src={logo.image}
          alt={logo.displayName}
          loading='lazy'
          className='h-12 sm:h-16 w-auto mx-auto object-contain transition-all duration-300 hover:scale-110 hover:shadow-md filter'
          onError={(e) => {
            console.error(`Failed to load image: ${logo.image}`);
          }}
        />
      </a>
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

    const logoWidth = window.innerWidth < 640 ? 140 + 16 : 180 + 32; // Responsive width + gap
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
      <div ref={containerRef} className='flex space-x-4 sm:space-x-8 py-4'>
        {logos.map((logo, index) => (
          <LogoCard key={`${logo.name}-${index}`} logo={logo} />
        ))}
      </div>
    </div>
  );
};

export default function Media() {
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
    <section
      ref={sectionRef}
      className='my-12 relative overflow-hidden bg-gradient-to-b from-gray-50/30 via-white to-white'
    >
      <div className='max-w-7xl mx-auto relative px-4'>
        {/* Header */}
        <div
          className={`
          text-center mb-6 transition-all duration-700 ease-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        >
          {/* Badge - matched with site style */}
          <div className='inline-flex items-center justify-center px-4 py-1 mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-sm transform transition-transform duration-500 hover:scale-105'>
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
                d='M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14'
              />
            </svg>
            <span className='font-medium text-blue-300'>Featured In</span>
          </div>

          <h2 className='text-4xl md:text-5xl font-bold mb-4 text-gray-900'>
            Media{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Recognition
            </span>
          </h2>

          <p className='text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed'>
            Our journey and innovations have been featured across leading media
            publications
          </p>
        </div>

        {/* Logo Carousel with enhanced styling */}
        <div
          className={`
          relative transition-all duration-700 ease-out delay-200
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        >
          {/* Improved gradient overlays */}
          <div className='absolute inset-0 pointer-events-none z-10'>
            <div
              className='absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-white to-transparent'
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, white, transparent)',
              }}
            />
            <div
              className='absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-white to-transparent'
              style={{
                WebkitMaskImage: 'linear-gradient(to left, white, transparent)',
              }}
            />
          </div>

          {/* Logo rows with increased spacing */}
          <div className='py-4 sm:py-8'>
            {' '}
            {/* Adjusted padding for mobile */}
            <ScrollingRow logos={mediaLogos} speed={2} />
          </div>
        </div>

        {/* Enhanced ending section with CTA */}
        <div
          className={`
          mt-16 text-center transition-all duration-700 ease-out delay-400 relative
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        >
          {/* Background decorative elements */}
          {/* <div className='absolute inset-0 pointer-events-none'>
            <div className='absolute top-0 left-1/4 w-96 h-xl bg-blue-300/40 rounded-full blur-lg transform rotate-12'></div>
            <div className='absolute bottom-0 right-1/4 w-96 h-xl bg-purple-300/40 rounded-full blur-2xl transform -rotate-12'></div>
            <div className='absolute top-1/2 left-1/2 w-64 h-96 bg-blue-300/30 rounded-full blur-xl transform -translate-x-1/2 -translate-y-1/2'></div>
          </div> */}

          {/* Content */}
          <div className='max-w-4xl mx-auto px-8 py-12 rounded-2xl bg-gradient-to-r from-blue-50/60 to-purple-50/60 backdrop-blur-sm border border-white/50 relative'>
            {/* Quote Icon */}
            <div className='absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110'>
              <svg
                className='w-5 h-5 text-white'
                fill='currentColor'
                viewBox='0 0 24 24'
              >
                <path d='M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z' />
              </svg>
            </div>

            <blockquote className='text-xl text-gray-700 font-medium italic mb-6'>
              "Founded in 2022 by Nikhil Parmar, Impactful Pitch is on a mission
              to empower 1 million entrepreneurs to create solutions that impact
              1 billion lives."
            </blockquote>

            <div className='flex flex-col items-center gap-6'>
              {/* Featured badges with enhanced styling */}
              <div className='flex items-center justify-center text-sm text-gray-600'>
                <span className='font-medium'>As featured in</span>
                <a
                  href='https://www.tice.news/tice-dispatch/startup-club-india-tice/from-vision-to-venture-how-impactful-pitch-is-helping-startups-raise-millions-8838236'
                  aria-label='TICE News article'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <img
                    src='/assets/media/Media_09.webp'
                    alt='TICE News logo'
                    className='py-1.5 h-12'
                  />
                </a>
                {/* <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 font-medium shadow-sm hover:shadow-md transition-all duration-300">TechCrunch</div>
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 font-medium shadow-sm hover:shadow-md transition-all duration-300">Economic Times</div> */}
              </div>

              {/* Enhanced CTA Section */}
              <div className='space-y-4'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Ready to make your pitch irresistible?
                </h3>
                <div className='flex flex-col items-center'>
                  <StyledButton
                    href='https://calendly.com/teamnikhilparmar/20min?back=1'
                    size='lg'
                  >
                    Start Crafting Your Story
                  </StyledButton>
                  {/* <p className="mt-3 text-sm text-gray-500">Join 500+ funded startups who trust us</p> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
