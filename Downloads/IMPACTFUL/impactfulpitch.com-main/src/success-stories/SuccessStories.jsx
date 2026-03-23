'use client';

import { useState, useEffect, useRef } from 'react';

import { caseStudies as caseStudiesOnHomePage } from '../home/SuccessStories';
const Fitspire = '/assets/success-stories/Fitspire.webp';
const WastefullInsights = '/assets/success-stories/WastefullInsights.webp';
const Superus = '/assets/success-stories/Superus.webp';
import StyledButton from '../components/StyledButton';

// Case Study Card Component with hover effects and animations
function CaseStudyCard({
  image,
  title,
  description,
  index,
  isVisible,
  link,
  alt,
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative bg-gray-900 text-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{
        transitionDelay: `${150 * index}ms`,
        transitionProperty: 'all',
        transitionDuration: '800ms',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <a href={link} target='_blank' rel='noopener noreferrer'>
        {/* Card highlight effect on hover */}
        {/* <div
        className={`absolute inset-0 bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-indigo-500/5 opacity-0 transition-opacity duration-500 ${isHovered ? 'opacity-100' : ''}`}
      ></div> */}

        <div className='h-48 overflow-hidden'>
          <img
            src={image}
            alt={alt}
            loading='lazy'
            className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-103' : 'scale-100'}`}
          />
          {/* Image overlay with gradient on hover */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-80' : 'opacity-0'}`}
          ></div>
        </div>
        <div className='p-5 relative'>
          {/* <div className="flex items-center mb-3">
          <div className={`w-2 h-2 rounded-full bg-${color}-500 mr-2 ${isHovered ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}></div>
          <span className="text-gray-400 text-sm">5 min read</span>
        </div> */}
          <h3
            className={`text-xl font-bold mb-3 transition-all duration-500 ${isHovered ? 'bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent' : 'text-white'}`}
          >
            {title}
          </h3>
          {/* <p className="text-gray-300 text-sm mb-4 line-clamp-2">{description}</p> */}
          {/* <div className={`w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'bg-blue-700 shadow-xl scale-110' : 'bg-blue-500'
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-white transition-transform duration-300 ${isHovered ? 'translate-x-0.5 scale-110' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div> */}
        </div>
      </a>
    </div>
  );
}

// Case studies data
const caseStudiesExtra = [
  {
    image: Fitspire,
    title: 'Nutrition Brand Fitspire Raises $1 Mn In Pre-Series A Round',
    link: 'https://entrackr.com/snippets/nutrition-brand-fitspire-raises-1-mn-in-pre-series-a-round-8692614',
    alt: 'Fitspire Team',
  },
  {
    image: WastefullInsights,
    title: 'Wasteful Insights Raised $150k From 100XVC',
    link: 'https://www.100x.vc/investment-thesis/wastefull-insights-100-x-vc-investment-thesis',
    alt: 'Wastefull Insights Team',
  },
  {
    image: Superus,
    title: 'Superus Raised Pre-Seed Funding Led By Venture Catalysts',
    link: 'https://www.marcamoney.com/superus-raises-pre-seed-funding-led-by-venture-catalysts/',
    alt: 'Superus Team',
  },
];

// let caseStudies = {};
const caseStudies = caseStudiesOnHomePage.concat(caseStudiesExtra); // Append extra case studies

export default function SuccessStories() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  // const [activeAvatar, setActiveAvatar] = useState(null);

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

  // Client avatars data
  // const clientAvatars = [
  //   "https://randomuser.me/api/portraits/men/32.jpg",
  //   "https://randomuser.me/api/portraits/women/44.jpg",
  //   "https://randomuser.me/api/portraits/men/46.jpg",
  //   "https://randomuser.me/api/portraits/women/28.jpg",
  //   "https://randomuser.me/api/portraits/men/22.jpg",
  //   "https://randomuser.me/api/portraits/women/76.jpg"
  // ];

  return (
    <div className='relative w-full min-h-screen bg-white'>
      <div className='relative z-10 pt-16 backdrop-blur-[1px]'>
        <section
          ref={sectionRef}
          className='py-16 pb-24 px-8 relative overflow-hidden z-10'
        >
          <div className='max-w-7xl mx-auto relative z-10'>
            {/* Section Header with animated underline */}
            <div
              className={`text-center mb-16 transition-all duration-1000 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
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
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
                <span className='font-medium text-blue-300'>
                  Success Stories
                </span>
              </div>
              <h2
                className={`text-4xl md:text-5xl font-bold mb-2 transition-all duration-700 delay-300 text-gray-900 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
              >
                The story of clients
              </h2>
              <h2
                className={`text-4xl md:text-5xl font-bold mb-2 transition-all duration-700 delay-500 text-gray-900 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
              >
                who have raised funds
              </h2>

              {/* Animated underline */}
              <div className='flex justify-center'>
                <div
                  className={`h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-8 transition-all duration-1000 delay-700 transform ${
                    isVisible
                      ? 'opacity-100 scale-x-100'
                      : 'opacity-0 scale-x-0'
                  }`}
                ></div>
              </div>
            </div>

            {/* Case Studies Grid with staggered animation */}
            {/* {console.log(caseStudies)} */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16'>
              {caseStudies.map((study, index) => (
                <CaseStudyCard
                  key={index}
                  image={study.image}
                  title={study.title}
                  description={study.description}
                  link={study.link}
                  index={index}
                  isVisible={isVisible}
                  alt={study.alt}
                />
              ))}
            </div>

            {/* Client Avatars with hover effects */}
            {/* <div
              className={`flex flex-col items-center transition-all duration-1000 delay-1000 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex -space-x-2 mb-4">
                {clientAvatars.map((avatar, index) => (
                  <div
                    key={index}
                    className="relative transform transition-all duration-300"
                    onMouseEnter={() => setActiveAvatar(index)}
                    onMouseLeave={() => setActiveAvatar(null)}
                    style={{
                      zIndex: activeAvatar === index ? 10 : 10 - index,
                      transform: activeAvatar === index ? 'scale(1.2) translateY(-10px)' : 'scale(1) translateY(0)'
                    }}
                  >
                    <img
                    src={avatar}
                    alt={`Funded client ${index + 1}`}
                      className="w-10 h-10 rounded-full border-2 border-white transition-all duration-300"
                      style={{
                        boxShadow: activeAvatar === index ? '0 10px 25px -5px rgba(59, 130, 246, 0.5)' : 'none',
                        borderColor: activeAvatar === index ? '#3b82f6' : 'white'
                      }}
                    />
                    {activeAvatar === index && (
                      <div
                        className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white text-xs text-blue-800 font-medium px-2 py-0.5 rounded-md shadow-md"
                        style={fadeInAnimation}
                      >
                        Client {index + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-gray-600 mb-8 text-center max-w-md">
                Be among <span className="text-blue-700 font-bold">400+</span> funded startups powered by Impactful pitch
              </p>
            </div> */}

            {/* CTA Section */}
            <div
              className={`mt-16 text-center transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            >
              <h3 className='text-2xl font-bold mb-4 text-gray-900'>
                Have a Vision? Let&apos;s build the pitch it deserves
              </h3>
              {/* <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                Let our expert team help you create a pitch deck that stands out and gets results
              </p> */}
              <StyledButton
                href='https://calendly.com/teamnikhilparmar/20min?back=1'
                size='lg'
                className='max-w-sm mx-auto'
              >
                Book a Call Now
              </StyledButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
