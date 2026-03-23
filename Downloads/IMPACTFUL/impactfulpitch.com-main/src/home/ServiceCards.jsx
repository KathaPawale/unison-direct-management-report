import React from 'react';

// import SpotlightCard from '../../components/SpotlightCard';
const Rocket = '/assets/rocket.svg';

// Service Card Component
function ServiceCard({ icon, title, description }) {
  return (
    <div className='group relative bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-b-blue-100 border-l-blue-100 border-r-purple-100 border-t-purple-100 hover:border-t-blue-100 hover:border-r-blue-100 hover:border-l-purple-100 hover:border-b-purple-100 overflow-hidden'>
      {/* Decorative background elements */}
      <div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-blue-100 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:translate-x-6 group-hover:-translate-y-6 transition-transform duration-500'></div>
      <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-50 to-purple-100 rounded-full blur-2xl transform -translate-x-8 translate-y-8 group-hover:-translate-x-6 group-hover:translate-y-6 transition-transform duration-500'></div>

      {/* Content */}
      <div className='relative'>
        <div className='w-14 h-14 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg flex items-center justify-center mb-6 transform group-hover:scale-110 group-hover: transition-transform duration-300 shadow-sm group-hover:shadow-md'>
          <div className='w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center transform group-hover: transition-transform duration-300'>
            {React.cloneElement(icon, {
              className:
                'h-6 w-6 text-blue-100 group-hover:text-purple-100 transition-colors duration-300',
            })}
          </div>
        </div>

        <h3 className='text-xl font-bold mb-3 text-gray-800 group-hover:text-gray-950 transition-colors duration-300'>
          {title}
        </h3>
        <p className='text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed'>
          {description}
        </p>

        {/* Arrow indicator */}
        {/* <div className="mt-6 flex items-center text-blue-500 group-hover:text-violet-500 transition-colors duration-300 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0">
          <span className="text-sm font-semibold mr-2">Learn More</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div> */}
      </div>
    </div>
  );
}

export default function ServiceCards() {
  // Service data
  const services = [
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-gray-700'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
          />
        </svg>
      ),
      title: 'Pitch Deck Design',
      description:
        'Investor deck with a captivating narrative & stunning design',
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-gray-700'
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
      ),
      title: 'Business Plan Development',
      description:
        'Articulate your vision, market opportunity and growth strategies with clarity',
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-gray-700'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
          />
        </svg>
      ),
      title: 'Financial Modelling & Valuation',
      description:
        "Thorough evaluations of valuation to accurately assess your startup's worth",
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-gray-700'
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
      title: "Founders' Grooming",
      description:
        'Strategic guidance & coaching for founders for investors meet',
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-6 w-6 text-gray-700'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
          />
        </svg>
      ),
      title: 'Investor Network Access',
      description:
        'Access to a curated network of investors seeking promising startups like yours',
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-full w-full text-blue-500'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <polygon points='23 7 16 12 23 17 23 7'></polygon>
          <rect x='1' y='5' width='15' height='14' rx='2' ry='2'></rect>
        </svg>
      ),
      title: 'Video Pitch Deck',
      description:
        'Engaging video pitches that tell your startup story visually and emotionally',
    },
  ];

  return (
    <section className='py-2 md:py-5 px-4 relative mx-auto max-w-7xl bg-white'>
      <div className='text-center '>
        <div className='inline-flex items-center justify-center px-4 py-1 mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-sm transform transition-transform duration-500 hover:scale-105'>
          <img
            src={Rocket}
            alt='Rocket Icon'
            loading='lazy'
            className='h-[18px] w-[18px] mr-2'
          />
          <span className='font-medium text-blue-300'>Our Services</span>
        </div>
        <h2 className='text-4xl md:text-5xl font-bold mb-4 text-gray-900'>
          Custom{' '}
          <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
            Fund Raising Solutions
          </span>
        </h2>
        <p className='text-gray-600 max-w-3xl mx-auto mb-6'>
          Strategic support that drives startup growth—from idea to investment
        </p>
      </div>
      {/* Service Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2'>
        {services.map((service, index) => (
          <ServiceCard
            key={index}
            icon={service.icon}
            title={service.title}
            description={service.description}
          />
        ))}
      </div>
    </section>
  );
}
