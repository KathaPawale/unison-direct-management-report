import React from 'react';
// import SpotlightCard from '../../components/SpotlightCard';

export default function Process() {
  const processSteps = [
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M3 18v-6a9 9 0 0 1 18 0v6'></path>
          <path d='M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z'></path>
        </svg>
      ),
      label: 'INTRODUCTION',
      title: 'Introductory Call with Our Startup Relations Team',
      points: [
        'Introduction to Our Services',
        'In-depth Discussion on Your Startup&apos;s Unique Goals',
      ],
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <circle cx='12' cy='12' r='10'></circle>
          <path d='M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'></path>
          <path d='M12 8v-2'></path>
          <path d='M12 18v-2'></path>
          <path d='M16 12h2'></path>
          <path d='M6 12h2'></path>
        </svg>
      ),
      label: 'UNDERSTANDING',
      title: 'Clarity & Detailed Explanation Sessions',
      points: [
        'Thorough Resolution of Questions',
        'Interactive Exchange of Key Information',
      ],
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <rect x='2' y='3' width='20' height='14' rx='2' ry='2'></rect>
          <path d='M8 21h8'></path>
          <path d='M12 17v4'></path>
        </svg>
      ),
      label: 'ONBOARDING',
      title: 'Onboarding & Payment Formalities',
      points: [
        'Initiate the payment process',
        'Commencing the Official Engagement Phase: Introduction to Key Team Members',
      ],
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'></path>
        </svg>
      ),
      label: 'MARKET ANALYSIS',
      title: 'Market Research / Secondary Research',
      points: [
        "Conducting market research aligned with investors' industry thesis",
        'Focus on secondary research to inform strategic decisions',
      ],
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'></path>
          <path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'></path>
        </svg>
      ),
      label: 'CREATION PROCESS',
      title: 'Content Crafting + Design + Financial Precision',
      points: [
        '1st Draft within first 10 Days',
        '2nd Draft within the Next 10 Days',
        'Final Editing within the Next 5 Days',
      ],
    },
    {
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'></path>
          <circle cx='9' cy='7' r='4'></circle>
          <path d='M23 21v-2a4 4 0 0 0-3-3.87'></path>
          <path d='M16 3.13a4 4 0 0 1 0 7.75'></path>
        </svg>
      ),
      label: 'FUNDING PREPARATION',
      title: 'Investor Engagement Journey',
      points: [
        'Initiate the payment process',
        'Commencing the Official Engagement Phase: Introduction to Key Team Members',
      ],
    },
  ];

  return (
    <section className='py-12 px-6 md:px-8 bg-white relative overflow-hidden'>
      <div className='max-w-7xl mx-auto relative z-10'>
        {/* Section Header */}
        <div className='text-center mb-16'>
          <div className='inline-flex items-center justify-center px-4 py-1 mb-6 rounded-full bg-gray-800 text-white text-sm transform transition-transform duration-500 hover:scale-105'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-4 w-4 mr-2 text-blue-400'
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
            <span className='font-medium text-blue-300'>Our Process</span>
          </div>
          <h2 className='text-4xl md:text-5xl font-bold mb-4 text-gray-900'>
            Streamlined for{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-600'>
              Your Success
            </span>
          </h2>
          <p className='text-lg text-gray-700 max-w-3xl mx-auto'>
            Synergistic Workflow: Balancing Founder and Investor Perspectives
            for Seamless Solutions
          </p>
        </div>

        {/* Process steps grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
          {processSteps.map((step, index) => (
            <div
              key={index}
              className='group relative bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-b-blue-100 border-l-blue-100 border-r-purple-100 border-t-purple-100 hover:border-t-blue-100 hover:border-r-blue-100 hover:border-l-purple-100 hover:border-b-purple-100 flex flex-col overflow-hidden'
            >
              {/* Decorative background elements */}
              <div className='absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-50 to-blue-100 rounded-full blur-xl transform translate-x-6 -translate-y-6 opacity-70 group-hover:opacity-100 transition-opacity duration-500'></div>
              <div className='absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-50 to-purple-100 rounded-full blur-xl transform -translate-x-6 translate-y-6 opacity-70 group-hover:opacity-100 transition-opacity duration-500'></div>

              {/* Content */}
              <div className='relative z-10 flex flex-col h-full'>
                <div className='w-14 h-14 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300 shadow-sm group-hover:shadow-md shrink-0'>
                  <div className='w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center'>
                    {React.cloneElement(step.icon, {
                      className:
                        'h-6 w-6 text-blue-100 group-hover:text-purple-100 transition-colors duration-300',
                    })}
                  </div>
                </div>

                <div className='inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold mb-4 self-start'>
                  {step.label}
                </div>
                <h3 className='text-xl font-bold mb-3 text-gray-800 group-hover:text-gray-950 transition-colors duration-300'>
                  {step.title}
                </h3>
                <ul className='space-y-2 text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed flex-grow'>
                  {step.points.map((point, pointIndex) => (
                    <li key={pointIndex} className='flex items-start'>
                      <svg
                        className='w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          fillRule='evenodd'
                          d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                          clipRule='evenodd'
                        ></path>
                      </svg>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
