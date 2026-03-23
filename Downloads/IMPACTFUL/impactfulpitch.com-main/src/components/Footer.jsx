'use client';

import { useState, useEffect, useRef } from 'react';
// Import logo path for Next.js
const logo = '/assets/ImpactfulPitchLogoWhite.webp';
import CustomLink from './CustomLink';
import StyledButton from './StyledButton';
import SocialIcons from './SocialIcons';

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  // Animation to reveal footer when it comes into view
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

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`bg-gradient-to-b from-gray-800 via-gray-900 to-gray-950 text-gray-300 pt-8 pb-8 lg:pt-14 lg:pb-12 relative overflow-hidden`}
      aria-labelledby='footer-heading'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-12'>
          {/* Left Column: Logo and Description */}
          <div
            className={`md:col-span-1 lg:col-span-4 text-center md:text-left transform transition-all duration-1000 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <CustomLink to='/' className='inline-block mb-6'>
              <img
                src={logo}
                alt='ImpactfulPitch Logo'
                className='h-12 w-auto mx-auto md:mx-0'
                loading='lazy'
              />
            </CustomLink>
            <p className='text-gray-400 leading-relaxed max-w-sm mx-auto md:mx-0 mb-2 md:mb-6'>
              Get Investment Ready with{' '}
              <span className='text-white font-semibold'>Impactful Pitch</span>,
              <br />
              Your End-to-End Fundraising Partner
            </p>
            <div className='flex justify-center md:justify-start'>
              <SocialIcons />
            </div>
          </div>

          {/* Middle Columns: Navigation Links */}
          <div
            className={`md:col-span-1 lg:col-span-4 grid grid-cols-2 gap-8 lg:gap-12 text-center md:text-left transform transition-all duration-1000 delay-300 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <div>
              <p className='text-white font-bold mb-4 lg:mb-6 tracking-wider uppercase text-sm'>
                Company
              </p>
              <ul className='space-y-2'>
                {['About', 'Contact'].map((item, index) => (
                  <li
                    key={item}
                    className='transform transition-all'
                    style={{
                      transitionDelay: `${300 + index * 50}ms`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible
                        ? 'translateY(0)'
                        : 'translateY(10px)',
                    }}
                  >
                    <CustomLink
                      to={
                        item === 'Contact'
                          ? '/contact'
                          : `/${item.toLowerCase()}`
                      }
                      className='text-gray-400 hover:text-white transition-all duration-400 py-1 inline-block hover:translate-x-1'
                    >
                      {item}
                    </CustomLink>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className='text-white font-bold mb-4 lg:mb-6 tracking-wider uppercase text-sm'>
                Quick Links
              </p>
              <ul className='space-y-2'>
                {['Home', 'Services', 'Portfolio'].map((item, index) => (
                  <li
                    key={item}
                    className='transform transition-all'
                    style={{
                      transitionDelay: `${350 + index * 50}ms`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible
                        ? 'translateY(0)'
                        : 'translateY(10px)',
                    }}
                  >
                    <CustomLink
                      to={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                      className='text-gray-400 hover:text-white transition-all duration-400 py-1 inline-block hover:translate-x-1'
                    >
                      {item}
                    </CustomLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Newsletter Subscribe */}
          <div
            className={`md:col-span-2 lg:col-span-4 text-center md:text-left transform transition-all duration-1000 delay-700 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            <p className='text-white font-bold mb-4 md:mb-6 tracking-wider uppercase text-sm'>
              Stay Updated
            </p>
            <p className='text-gray-400 mb-6 max-w-sm mx-auto md:mx-0'>
              Get the latest news, insights and product updates directly in your
              inbox.
            </p>
            <a
              href='https://www.linkedin.com/build-relation/newsletter-follow?entityUrn=7286984725318045696'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-block w-full px-2'
            >
              <StyledButton
                size='lg'
                className='w-full shadow-blue-900/30 hover:shadow-blue-900/50 hover:bg-gray-200 py-3 cursor-pointer'
              >
                Subscribe to Newsletter
              </StyledButton>
            </a>
          </div>
        </div>

        {/* Footer Bottom */}
        <div
          className={`mt-8 pt-6 lg:mt-12 lg:pt-8 border-t border-gray-700/50 text-center md:flex md:justify-between md:items-center transition-all duration-1000 delay-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className='text-sm text-gray-500 mb-4 md:mb-0'>
            &copy; {new Date().getFullYear()} Pitchverse Global Network Pvt.
            Ltd. All rights reserved.
          </p>
          <div className='flex justify-center md:justify-end space-x-8'>
            <CustomLink
              to='/privacy-policy'
              className='text-sm text-gray-500 hover:text-gray-300 transition-all duration-400 hover:-translate-y-1'
            >
              Privacy Policy
            </CustomLink>
            <CustomLink
              to='/terms'
              className='text-sm text-gray-500 hover:text-gray-300 transition-all duration-400 hover:-translate-y-1'
            >
              Terms of Service
            </CustomLink>
            <CustomLink
              to='/refund-policy'
              className='text-sm text-gray-500 hover:text-gray-300 transition-all duration-400 hover:-translate-y-1'
            >
              Refund Policy
            </CustomLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
