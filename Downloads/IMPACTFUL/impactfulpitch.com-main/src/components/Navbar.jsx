'use client';

// Import logo path for Next.js
const logo = '/assets/ImpactfulPitchLogo.svg';
import { useState, useEffect } from 'react';
import StyledButton from './StyledButton';
import CustomLink from './CustomLink';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track scroll position for navbar appearance changes
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 30;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuOpen &&
        !event.target.closest('.mobile-menu') &&
        !event.target.closest('.mobile-menu-button')
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    // Store the original overflow value
    const originalOverflow = document.body.style.overflow;

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow || 'auto';
    }

    // Cleanup function to restore original overflow when component unmounts
    // or when mobile menu state changes
    return () => {
      document.body.style.overflow = originalOverflow || 'auto';
    };
  }, [mobileMenuOpen]);

  // Additional cleanup on component unmount to ensure body overflow is restored
  useEffect(() => {
    return () => {
      // Force restore body overflow when component unmounts completely
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-10 backdrop-blur-sm transition-all duration-500 ease-in-out ${
          scrolled
            ? 'py-3 bg-white/60 shadow-[0_0_15px_rgba(0,0,0,0.2)]'
            : 'py-5 bg-gradient-to-r from-blue-50/30 via-purple-50/30 to-blue-50/30'
        }`}
      >
        {/* Subtle animated border that appears on scroll */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-700/40 to-transparent transform transition-opacity duration-400 ease-in-out ${scrolled ? 'opacity-100' : 'opacity-0'}`}
        ></div>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          {/* Logo with hover animation */}
          <CustomLink
            to='/'
            className='relative group flex items-center scale-103'
            onMouseEnter={() => setHovered('logo')}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Logo glow effect */}
            <div
              className={`absolute -inset-1 rounded-full bg-blue-400/20 blur-md transition-opacity duration-300 ${hovered === 'logo' ? 'opacity-100' : 'opacity-0'}`}
            ></div>
            <div className='relative transform transition-transform duration-300 group-hover:scale-104'>
              <img
                src={logo}
                alt='ImpactfulPitch Logo'
                className='h-10 sm:h-12 w-auto'
              />
            </div>
          </CustomLink>

          {/* Navigation Links with hover effects */}
          <div className='hidden md:flex items-center space-x-4 lg:space-x-12'>
            <NavLink
              to='/'
              label='Home'
              active={hovered === 'home'}
              onMouseEnter={() => setHovered('home')}
              onMouseLeave={() => setHovered(null)}
            />
            <NavLink
              to='/about'
              label='About'
              active={hovered === 'about'}
              onMouseEnter={() => setHovered('about')}
              onMouseLeave={() => setHovered(null)}
            />
            <NavLink
              to='/services'
              label='Services'
              active={hovered === 'services'}
              onMouseEnter={() => setHovered('services')}
              onMouseLeave={() => setHovered(null)}
            />
            <NavLink
              to='/portfolio'
              label='Portfolio'
              active={hovered === 'portfolio'}
              onMouseEnter={() => setHovered('portfolio')}
              onMouseLeave={() => setHovered(null)}
            />
            <NavLink
              to='/contact'
              label='Contact'
              active={hovered === 'contact'}
              onMouseEnter={() => setHovered('contact')}
              onMouseLeave={() => setHovered(null)}
            ></NavLink>
          </div>

          {/* CTA Button using the new StyledButton component */}
          <div className='hidden md:block'>
            <StyledButton
              href='https://instapitch.io'
              size='md'
              onMouseEnter={() => setHovered('cta')}
              onMouseLeave={() => setHovered(null)}
            >
              Explore our AI
            </StyledButton>
          </div>

          {/* Mobile menu button with animation */}
          <button
            className='md:hidden relative w-10 h-10 -mr-2 flex items-center justify-center text-gray-800 rounded-full hover:bg-white/10 transition-colors duration-300 mobile-menu-button'
            aria-label='Toggle mobile menu'
            title='Toggle mobile menu'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className='flex flex-col items-center justify-center space-y-1.5 w-6'>
              <span
                className={`block h-0.5 w-full bg-gray-600 rounded-full transition-transform duration-500 origin-left ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
              ></span>
              <span
                className={`block h-0.5 w-4/5 bg-gray-600 rounded-full transition-all duration-500 ${mobileMenuOpen ? 'opacity-0 translate-x-3' : ''}`}
              ></span>
              <span
                className={`block h-0.5 w-3/5 bg-gray-600 rounded-full transition-transform duration-500 origin-left ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5 w-full' : ''}`}
              ></span>
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden mobile-menu ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className='p-6 h-full flex flex-col'>
          <div className='flex justify-end mb-8'>
            <button
              className='p-2 rounded-full hover:bg-gray-100'
              title='Close menu'
              aria-label='Close menu'
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-6 w-6 text-gray-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          <div className='flex flex-col space-y-6'>
            <MobileNavLink
              to='/'
              label='Home'
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to='/about'
              label='About'
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to='/services'
              label='Services'
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to='/portfolio'
              label='Portfolio'
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to='/contact'
              label='Contact Us'
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>

          <div className='mt-auto pt-6 border-t border-gray-100'>
            <StyledButton
              href='https://instapitch.io'
              size='lg'
              className='w-full justify-center'
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore our AI
            </StyledButton>
          </div>
        </div>
      </div>
    </>
  );
}

// NavLink component with animation
function NavLink({ to, label, active, onMouseEnter, onMouseLeave }) {
  return (
    <CustomLink
      to={to}
      className='relative group py-2 px-1'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Text with hover effect */}
      <span className='relative z-10 text-gray-700 font-medium transition-colors duration-300 group-hover:text-gray-950'>
        {label}
      </span>

      {/* Animated underline */}
      <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-blue-500 group-hover:w-full transition-all duration-300 ease-out'></span>
    </CustomLink>
  );
}

// Mobile NavLink component
function MobileNavLink({ to, label, onClick }) {
  return (
    <CustomLink
      to={to}
      className='py-2 px-4 text-lg font-medium text-gray-800 hover:text-blue-500 transition-colors duration-200'
      onClick={onClick}
    >
      {label}
    </CustomLink>
  );
}
