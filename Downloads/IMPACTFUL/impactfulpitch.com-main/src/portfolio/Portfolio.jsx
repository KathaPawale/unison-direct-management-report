'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// --- 1. NEW DATA STRUCTURE: Manually define your client data here ---
// This is now the single source of truth for your portfolio.
// Simply add or remove objects from this array to update your portfolio.
const clientData = [
  {
    id: 1,
    src: '/assets/clients/Our Client logos-01.webp',
    industry: 'Venture Capital',
  },
  {
    id: 2,
    src: '/assets/clients/Our Client logos-02.webp',
    industry: 'Fintech',
  },
  {
    id: 3,
    src: '/assets/clients/Our Client logos-03.webp',
    industry: 'Direct to Consumers',
  },
  {
    id: 4,
    src: '/assets/clients/Our Client logos-04.webp',
    industry: 'InsurTech',
  },
  {
    id: 5,
    src: '/assets/clients/Our Client logos-05.webp',
    industry: 'Mobility',
  },
  {
    id: 6,
    src: '/assets/clients/Our Client logos-06.webp',
    industry: 'Ruraltech',
  },
  {
    id: 7,
    src: '/assets/clients/Our Client logos-07.webp',
    industry: 'SaaS',
  },
  {
    id: 8,
    src: '/assets/clients/Our Client logos-08.webp',
    industry: 'Health & Wellness',
  },
  {
    id: 9,
    src: '/assets/clients/Our Client logos-09.webp',
    industry: 'Venture Capital',
  },
  {
    id: 10,
    src: '/assets/clients/Our Client logos-10.webp',
    industry: 'Technology',
  },
  {
    id: 11,
    src: '/assets/clients/Our Client logos-11.webp',
    industry: 'Media',
  },
  {
    id: 12,
    src: '/assets/clients/Our Client logos-12.webp',
    industry: 'Fashion',
  },
  {
    id: 13,
    src: '/assets/clients/Our Client logos-13.webp',
    industry: 'Technology',
  },
  {
    id: 14,
    src: '/assets/clients/Our Client logos-14.webp',
    industry: 'Handicraft',
  },
  {
    id: 15,
    src: '/assets/clients/Our Client logos-15.webp',
    industry: 'Fashion',
  },
  {
    id: 16,
    src: '/assets/clients/Our Client logos-16.webp',
    industry: 'Service',
  },
  {
    id: 17,
    src: '/assets/clients/Our Client logos-17.webp',
    industry: 'Venture Capital',
  },
  {
    id: 18,
    src: '/assets/clients/Our Client logos-18.webp',
    industry: 'Ruraltech',
  },
  {
    id: 19,
    src: '/assets/clients/Our Client logos-19.webp',
    industry: 'SaaS',
  },
  {
    id: 20,
    src: '/assets/clients/Our Client logos-20.webp',
    industry: 'Food & Beverages',
  },
  {
    id: 21,
    src: '/assets/clients/Our Client logos-21.webp',
    industry: 'Health & Wellness',
  },
  {
    id: 22,
    src: '/assets/clients/Our Client logos-22.webp',
    industry: 'SaaS',
  },
  {
    id: 23,
    src: '/assets/clients/Our Client logos-23.webp',
    industry: 'Cybersecurity',
  },
  {
    id: 24,
    src: '/assets/clients/Our Client logos-24.webp',
    industry: 'Proptech',
  },
  {
    id: 25,
    src: '/assets/clients/Our Client logos-25.webp',
    industry: 'FMCG',
  },
  {
    id: 26,
    src: '/assets/clients/Our Client logos-26.webp',
    industry: 'Waste Management',
  },
  {
    id: 27,
    src: '/assets/clients/Our Client logos-27.webp',
    industry: 'Technology',
  },
  {
    id: 28,
    src: '/assets/clients/Our Client logos-28.webp',
    industry: 'Health & Wellness',
  },
  {
    id: 29,
    src: '/assets/clients/Our Client logos-29.webp',
    industry: 'Service',
  },
  {
    id: 30,
    src: '/assets/clients/Our Client logos-30.webp',
    industry: 'E-Commerce',
  },
  {
    id: 31,
    src: '/assets/clients/Our Client logos-31.webp',
    industry: 'Fintech',
  },
  {
    id: 32,
    src: '/assets/clients/Our Client logos-32.webp',
    industry: 'Technology',
  },
  {
    id: 33,
    src: '/assets/clients/Our Client logos-33.webp',
    industry: 'Venture Capital',
  },
  {
    id: 34,
    src: '/assets/clients/Our Client logos-34.webp',
    industry: 'Tourism',
  },
  {
    id: 35,
    src: '/assets/clients/Our Client logos-35.webp',
    industry: 'Proptech',
  },
  {
    id: 36,
    src: '/assets/clients/Our Client logos-36.webp',
    industry: 'Music',
  },
  {
    id: 37,
    src: '/assets/clients/Our Client logos-37.webp',
    industry: 'Direct to Consumers',
  },
  {
    id: 38,
    src: '/assets/clients/Our Client logos-38.webp',
    industry: 'SaaS',
  },
  {
    id: 39,
    src: '/assets/clients/Our Client logos-39.webp',
    industry: 'Health & Wellness',
  },
  {
    id: 40,
    src: '/assets/clients/Our Client logos-40.webp',
    industry: 'Technology',
  },
  {
    id: 41,
    src: '/assets/clients/Our Client logos-41.webp',
    industry: 'Mobility',
  },
  {
    id: 42,
    src: '/assets/clients/Our Client logos-42.webp',
    industry: 'Venture Capital',
  },
  {
    id: 43,
    src: '/assets/clients/Our Client logos-43.webp',
    industry: 'Direct to Consumers',
  },
  {
    id: 44,
    src: '/assets/clients/Our Client logos-44.webp',
    industry: 'Service',
  },
  {
    id: 45,
    src: '/assets/clients/Our Client logos-45.webp',
    industry: 'Service',
  },
  {
    id: 46,
    src: '/assets/clients/Our Client logos-46.webp',
    industry: 'Food & Beverages',
  },
  {
    id: 47,
    src: '/assets/clients/Our Client logos-47.webp',
    industry: 'Robotics',
  },
  {
    id: 48,
    src: '/assets/clients/Our Client logos-48.webp',
    industry: 'Education',
  },
  {
    id: 49,
    src: '/assets/clients/Our Client logos-49.webp',
    industry: 'FMCG',
  },
  {
    id: 50,
    src: '/assets/clients/Our Client logos-50.webp',
    industry: 'E-Commerce',
  },
];

export default function Portfolio() {
  return (
    <div className='min-h-screen pt-24 pb-16 z-10 backdrop-blur-[1px] px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white'>
      <div className='max-w-7xl mx-auto'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='text-center mb-12'
        >
          <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-4'>
            Our{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Portfolio
            </span>
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            Explore our diverse portfolio of clients across various industries
          </p>
        </motion.div>

        {/* Client Logos Grid */}
        <motion.div
          className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8'
          initial='hidden' // The initial state for all children
          animate='visible' // The final state for all children
          variants={{
            // The animation logic is defined directly inline
            visible: {
              transition: {
                // This property makes each child animate 0.03s after the previous one
                staggerChildren: 0.03,
              },
            },
          }}
        >
          {clientData.map((logo, index) => (
            // This component inherits its state ("hidden" or "visible") from the parent.
            <motion.div
              key={logo.id}
              variants={{
                // The item's animation is also defined inline
                hidden: { opacity: 0 }, // Start invisible
                visible: { opacity: 1 }, // End visible
              }}
              transition={{ duration: 0.3 }} // Controls the speed of this specific item's fade-in
              className='relative group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex items-center justify-center border border-gray-100 hover:border-transparent'
            >
              <img
                src={logo.src}
                alt={`Client Logo ${logo.id}`}
                className='max-h-24 max-w-full object-contain'
              />
              <div className='absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full whitespace-nowrap tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                {logo.industry}
              </div>
            </motion.div>
          ))}
          {/* ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No clients found in this industry.</p>
            </div>
          )} */}
        </motion.div>
      </div>
    </div>
  );
}
