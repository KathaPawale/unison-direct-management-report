'use client';

import { motion } from 'framer-motion';
import { FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa';
import { BiTrophy } from 'react-icons/bi';
import { HiAcademicCap } from 'react-icons/hi';

const NikhilParmar = '/assets/NikhilParmar.webp';
// import { BsBriefcase, BsLightbulb } from 'react-icons/bs';

// Import all institution logos
const Wadhwani = '/assets/mentored-at/Wadhwani.webp';
const Jito = '/assets/mentored-at/Jito.webp';
const IIMU = '/assets/mentored-at/IIMU.webp';
const Climate = '/assets/mentored-at/Climate.webp';
const Aic = '/assets/mentored-at/Aic.webp';
const Svit = '/assets/mentored-at/Svit.webp';
const Navrachna = '/assets/mentored-at/Navrachna.webp';
const Parul = '/assets/mentored-at/Parul.webp';

const institutionLogos = [
  Wadhwani,
  Jito,
  IIMU,
  Climate,
  Aic,
  Svit,
  Navrachna,
  Parul,
];

export default function ManBehind({
  chipText,
  normalHeading,
  highlightedHeading,
  description,
}) {
  // Expert's achievements
  const achievements = [
    {
      icon: <BiTrophy className='text-3xl text-amber-400' />,
      title: '10000+ Startups',
      description: 'Guided in Fundraising',
    },
    {
      icon: <HiAcademicCap className='text-3xl text-blue-400' />,
      title: '1 Bn+ Lives',
      description: 'His Impact Mission',
    },
    // {
    //   icon: <BsBriefcase className="text-3xl text-purple-400" />,
    //   title: "10+ Years",
    //   description: "VC ecosystem experience"
    // },
    // {
    //   icon: <BsLightbulb className="text-3xl text-green-400" />,
    //   title: "Industry Expert",
    //   description: "Recognized mentor & advisor"
    // }
  ];

  return (
    <section className='pb-4 px-4 sm:px-8 relative overflow-hidden bg-white'>
      <div className='max-w-7xl mx-auto relative z-10'>
        {/* Section Header */}
        <div className='text-center mb-12'>
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
                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              />
            </svg>
            <span className='font-medium text-blue-300'>{chipText}</span>
          </div>
          <h2 className='text-4xl font-bold mb-4 text-gray-900'>
            {normalHeading}{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              {highlightedHeading}
            </span>
          </h2>
          <p className='text-gray-600 max-w-2xl mx-auto mb-12'>{description}</p>
        </div>

        {/* Main Content Container */}
        <div className='max-w-7xl mx-auto'>
          {/* Top Row: Image, Stats and Mentored At */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 items-start mb-4 sm:mb-8'>
            {/* Profile Image Column */}
            <motion.div
              className='lg:col-span-4 my-auto lg:mr-5'
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className='relative max-w-sm mx-auto p-4 sm:p-2'>
                {/* Image container with gradient background */}
                <div className='relative mb-4 sm:mb-6'>
                  <div className='absolute inset-0 bg-gradient-to-br from-blue-600/20 to-violet-500/20 rounded-3xl transform rotate-6 scale-105' />
                  <div className='relative bg-white rounded-3xl overflow-hidden shadow-2xl'>
                    <div className='aspect-w-3 aspect-h-4'>
                      <img
                        src={NikhilParmar}
                        alt='Nikhil Parmar'
                        loading='lazy'
                        className='w-full h-full object-cover object-center transform transition-transform hover:scale-105 duration-700'
                        // onError={(e) => {
                        //   e.target.onerror = null;
                        //   e.target.src = "https://placehold.co/600x800/0066ff/ffffff?text=Nikhil+Parmar";
                        // }}
                      />
                      <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 flex justify-center gap-4'>
                        <a
                          href='https://in.linkedin.com/in/nikhilrparmar'
                          aria-label='Nikhil Parmar LinkedIn'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110'
                        >
                          <FaLinkedinIn className='text-white text-lg' />
                        </a>
                        <a
                          href='https://www.instagram.com/animpactentrepreneur'
                          aria-label='Nikhil Parmar Instagram'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110'
                        >
                          <FaInstagram className='text-white text-lg' />
                        </a>
                        <a
                          href='https://wa.me/9987999236'
                          aria-label='Nikhil Parmar WhatsApp'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110'
                        >
                          <FaWhatsapp className='text-white text-lg' />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Text content below image */}
                <div className='text-center space-y-1 sm:space-y-2'>
                  <h3 className='text-2xl font-bold text-gray-900'>
                    Nikhil Parmar
                  </h3>
                  <div className='space-y-1'>
                    <p className='text-gray-600'>Founder & CEO</p>
                  </div>
                  <div className=''>
                    <span className='inline-flex items-center bg-gradient-to-r from-blue-100/50 to-purple-100/50 px-4 py-2 rounded-full'>
                      <span className='text-sm text-gray-600'>IIM Alumni</span>
                      <span className='mx-2 scale-120 text-gray-700'>•</span>
                      <span className='text-sm text-gray-600'>
                        Angel Investor
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Section with 2-column layout */}
            <div className='lg:col-span-8'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 h-full'>
                {/* Left Column: Stats + Key Highlights */}
                <div className='space-y-6 my-auto'>
                  {/* Achievement Stats */}
                  <motion.div
                    className='grid grid-cols-2 gap-4'
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={index}
                        className='bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-shadow'
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <div className='w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mb-3'>
                          {achievement.icon}
                        </div>
                        <h4 className='text-lg font-bold text-gray-900 mb-1'>
                          {achievement.title}
                        </h4>
                        <p className='text-gray-600 text-sm'>
                          {achievement.description}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Key Highlights Section */}
                  <motion.div
                    className='bg-white rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className='flex items-center mb-3 sm:mb-5'>
                      <div className='p-2.5 bg-blue-50 rounded-xl mr-4'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          className='h-6 w-6 text-blue-500'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                      </div>
                      <h3 className='text-xl font-bold text-gray-900'>
                        Key Highlights
                      </h3>
                    </div>
                    <ul className='space-y-1 sm:space-y-2 text-gray-700 text-sm sm:text-base'>
                      <li className='items-start'>
                        <a
                          href='https://youtu.be/xpdZYf1WDBQ'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex'
                        >
                          <svg
                            className='h-5 w-5 text-blue-500 mr-2 mt-1 flex-shrink-0'
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                              clipRule='evenodd'
                            />
                          </svg>
                          <span className='hover:text-[#1c75bc]'>
                            <span className='text-red-600 font-bold'>
                              TED<sup className='text-red-700 '>x</sup>
                            </span>{' '}
                            speaker, global impact strategist and serial
                            entrepreneur
                          </span>
                        </a>
                      </li>
                      <li className='items-start'>
                        <a
                          href='https://entrepreneurstoday.in/revolutionizing-startup-funding-with-generative-ai-meet-nikhil-parmar-founder-of-impactful-pitch/'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex'
                        >
                          <svg
                            className='h-5 w-5 text-blue-500 mr-2 mt-1 flex-shrink-0'
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                              clipRule='evenodd'
                            />
                          </svg>
                          <span className='hover:text-[#1c75bc]'>
                            Awarded Entrepreneur{' '}
                            <span className='font-bold text-gray-800'>
                              35under35
                            </span>{' '}
                            by Economic Times, 2023 and Best Startup Mentor of
                            the Year 2023 in Asia
                          </span>
                        </a>
                      </li>
                      <li className='flex items-start'>
                        <svg
                          className='h-5 w-5 text-blue-500 mr-2 mt-1 flex-shrink-0'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                            clipRule='evenodd'
                          />
                        </svg>
                        <span>
                          Expertise: Fundraising strategy & investments,
                          startups, manufacturing, finance, product development,
                          marketing, operations and growth
                        </span>
                      </li>
                    </ul>
                  </motion.div>
                </div>

                {/* Right Column: Mentored At */}
                <div className='my-auto'>
                  <motion.div
                    className='bg-white rounded-2xl p-4 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.08)] h-full'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className='flex items-center mb-3 sm:mb-6'>
                      <div className='p-2.5 bg-purple-50 rounded-xl mr-4'>
                        <HiAcademicCap className='text-2xl text-violet-600' />
                      </div>
                      <h3 className='text-xl font-bold text-gray-900'>
                        Mentored at
                      </h3>
                    </div>
                    <div className='grid grid-cols-2 gap-3 sm:gap-6'>
                      {institutionLogos.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 * index }}
                          className='relative group my-auto'
                        >
                          <div className='aspect-w-3 aspect-h-2 bg-gray-50 rounded-xl p-2 sm:p-4 flex items-center justify-center transform transition-all duration-300 hover:shadow-md'>
                            <img
                              src={item}
                              alt={`Mentored at ${index}`}
                              loading='lazy'
                              className='max-w-full max-h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300 scale-85 md:scale-100'
                              // onError={(e) => {
                              //   e.target.onerror = null;
                              //   e.target.style.display = 'none';
                              //   e.target.nextSibling.style.display = 'block';
                              // }}
                            />
                            <span className='hidden text-sm font-medium text-gray-600'>
                              {item}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
