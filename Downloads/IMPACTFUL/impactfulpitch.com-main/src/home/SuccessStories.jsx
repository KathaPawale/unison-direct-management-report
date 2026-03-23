'use client';

import { useState, useEffect, useRef } from 'react';
import StyledButton from '../components/StyledButton';

// Asset paths for Next.js public folder
const Algobulls = '/assets/success-stories/Algobulls.webp';
const Stylework = '/assets/success-stories/Stylework.webp';
const Alyf = '/assets/success-stories/Alyf.webp';
const Hesa = '/assets/success-stories/Hesa.webp';
const IdealInsurance = '/assets/success-stories/IdealInsurance.webp';
const KSKT = '/assets/success-stories/KSKT.webp';

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
export const caseStudies = [
  {
    image: Algobulls,
    title:
      'AlgoBulls Raises $2 Million in Pre-Series A Funding Led by Venture Catalysts',
    // description: "We are the top digital marketing agency for branding corp. We offer a full rang engine...",
    link: 'https://www.entrepreneur.com/en-in/news-and-trends/algobulls-raises-2-million-in-pre-series-a-funding-led-by/440483',
    alt: 'AlogoBulls Team',
  },
  {
    image: Stylework,
    title:
      'Coworking Startup Stylework Raised $2 Mn Funding From Capri Global Holdings, QI Ventures',
    link: 'https://www.entrepreneur.com/en-in/news-and-trends/algobulls-raises-2-million-in-pre-series-a-funding-led-by/440483',
    alt: 'Stylework Team',
  },
  {
    image: Alyf,
    title:
      "India's First Holiday Home Fractional Ownership Platform Alyf Raises $1.5 Million In Seed Capital",
    link: 'https://www.entrepreneur.com/en-in/news-and-trends/algobulls-raises-2-million-in-pre-series-a-funding-led-by/440483',
    alt: 'Alyf Team',
  },
  {
    image: Hesa,
    title: 'Hesa raises $2.3 Mn in Pre-Series A round led by Venture Catalysts',
    link: 'https://entrackr.com/2022/06/hesa-raises-2-3-mn-in-pre-series-a-round-led-by-venture-catalysts/',
    alt: 'Hesa Team',
  },
  {
    image: IdealInsurance,
    title: 'Ideal Insurance raised ₹8 Cr as Pre-Series A Funds',
    link: 'https://timesofindia.indiatimes.com/city/kolkata/ideal-insurance-raises-8cr-as-pre-series-a-funds/articleshow/109576072.cms',
    alt: 'Ideal Insurance Team',
  },
  {
    image: KSKT,
    title: 'KSKT Secures $1.3m In A Strategic Mix Of Equity & Debt',
    link: 'https://startuptalky.com/news/kskt-raises-1-3-million-equity-debt/',
    alt: 'KSKT Team',
  },
];

export default function SuccessStories() {
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
      className='pt-6 md:pt-8 pb-4 md:pb-8 px-4 md:px-8 relative overflow-hidden bg-white'
    >
      <div className='max-w-7xl mx-auto relative z-10'>
        {/* Section Header */}
        <div
          className={`text-center mb-8 md:mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
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
            <span className='font-medium text-blue-300'>Success Stories</span>
          </div>
          <h2
            className={`text-3xl md:text-5xl font-bold mb-2 transition-all duration-700 delay-300 text-gray-900 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            Stories of{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Funding Success
            </span>
          </h2>
          <p
            className={`text-gray-600 max-w-2xl mx-auto mb-2 transition-all duration-700 delay-500 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
          >
            Startups we've helped craft compelling pitches and raise funding
          </p>
        </div>

        {/* Case Studies Grid with staggered animation */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-12 md:mb-16'>
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
        <div
          className={`flex flex-col items-center transition-all duration-1000 delay-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className='text-gray-600 mb-4 text-center px-4'>
            Be among the innovators turning ambition into achievement— with{' '}
            <span className='text-blue-700 font-bold'>Impactful Pitch</span>
          </p>
          <StyledButton to='/success-stories' size='md'>
            Browse all
          </StyledButton>
        </div>
      </div>
    </section>
  );
}
