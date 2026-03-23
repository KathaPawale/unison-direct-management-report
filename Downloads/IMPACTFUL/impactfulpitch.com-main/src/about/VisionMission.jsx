'use client';

import { motion } from 'framer-motion';
import SpotlightCard from '../components/SpotlightCard';

const ethics = [
  {
    title: 'Integrity and Honesty',
    icon: '⚖️',
    description:
      'We act with truth, fairness and transparency in every decision we make.',
  },
  {
    title: 'Respect and Diversity',
    icon: '🌍',
    description:
      'We value all voices, embracing different backgrounds, ideas and perspectives.',
  },
  {
    title: 'Client-Centric Approach',
    icon: '🤝',
    description:
      'We put clients first, solving problems with empathy, care and commitment.',
  },
  {
    title: 'Social Responsibility',
    icon: '🌍',
    description:
      'We build consciously, giving back to people, planet and purpose.',
  },
  {
    title: 'Continuous Improvement',
    icon: '🔄',
    description:
      'We grow through learning, feedback and constant pursuit of better outcomes.',
  },
  {
    title: 'Teamwork',
    icon: '🤝',
    description:
      'We win together by sharing goals, knowledge and mutual support.',
  },
];

export default function VisionMission() {
  return (
    <section className='py-4 md:py-8 px-4 md:px-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Vision-Mission Section */}
        <div className=''>
          {/* Section Header */}
          <div className='text-center mb-6 md:mb-12'>
            <div className='inline-flex items-center justify-center px-4 py-1 mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-sm transform transition-transform duration-500 hover:scale-105'>
              <span className='font-medium text-blue-300'>Foundation</span>
            </div>
            <h2 className='text-3xl md:text-4xl lg:text-5xl font-bold mb-4 px-4 text-gray-900'>
              Our{' '}
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
                Why
              </span>
            </h2>
            <p className='text-gray-600 max-w-3xl mx-auto text-base md:text-lg px-4'>
              A Sharper Pitch. A Better Chance. A Stronger Startup Ecosystem
            </p>
          </div>
          {/* Vision & Mission Cards */}
          <div className='grid md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-16'>
            {/* Vision Card */}
            <SpotlightCard
              className='group relative bg-gradient-to-br from-white to-gray-50 p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100'
              spotlightColor='rgba(200, 130, 230, 0.2)'
            >
              {/* Decorative background elements */}
              <div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-blue-100 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:translate-x-6 group-hover:-translate-y-6 transition-transform duration-500'></div>
              <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-50 to-purple-100 rounded-full blur-2xl transform -translate-x-8 translate-y-8 group-hover:-translate-x-6 group-hover:translate-y-6 transition-transform duration-500'></div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className='relative'
              >
                <div className='flex items-center mb-4 md:mb-6'>
                  <div className='w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg flex items-center justify-center mr-3 md:mr-4 transform group-hover:scale-110 group-hover: transition-transform duration-300 shadow-sm group-hover:shadow-md'>
                    <div className='w-10 h-10 md:w-12 md:h-12 bg-gray-800 rounded-lg flex items-center justify-center transform group-hover: transition-transform duration-300'>
                      <span className='h-5 w-5 md:h-6 md:w-6 text-blue-100 group-hover:text-purple-100 transition-colors duration-300'>
                        🎯
                      </span>
                    </div>
                  </div>
                  <h3 className='text-xl md:text-2xl font-bold text-gray-800 group-hover:text-gray-950 transition-colors duration-300'>
                    Vision
                  </h3>
                </div>
                <p className='text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed'>
                  To evolve the startup ecosystem, where the ratio of funded
                  startups is being increased.
                </p>
              </motion.div>
            </SpotlightCard>

            {/* Mission Card */}
            <SpotlightCard
              className='group relative bg-gradient-to-br from-white to-gray-50 p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100 hover:-translate-y-1'
              spotlightColor='rgba(200, 130, 230, 0.2)'
            >
              {/* Decorative background elements */}
              <div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-blue-100 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:translate-x-6 group-hover:-translate-y-6 transition-transform duration-500'></div>
              <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-50 to-purple-100 rounded-full blur-2xl transform -translate-x-8 translate-y-8 group-hover:-translate-x-6 group-hover:translate-y-6 transition-transform duration-500'></div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className='relative'
              >
                <div className='flex items-center mb-4 md:mb-6'>
                  <div className='w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg flex items-center justify-center mr-3 md:mr-4 transform group-hover:scale-110 group-hover: transition-transform duration-300 shadow-sm group-hover:shadow-md'>
                    <div className='w-10 h-10 md:w-12 md:h-12 bg-gray-800 rounded-lg flex items-center justify-center transform group-hover: transition-transform duration-300'>
                      <span className='h-5 w-5 md:h-6 md:w-6 text-blue-100 group-hover:text-purple-100 transition-colors duration-300'>
                        🚀
                      </span>
                    </div>
                  </div>
                  <h3 className='text-xl md:text-2xl font-bold text-gray-800 group-hover:text-gray-950 transition-colors duration-300'>
                    Mission
                  </h3>
                </div>
                <p className='text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed'>
                  Our vision is to transform the global pitching process by
                  empowering entrepreneurs with mentorship, resources and
                  technology, fostering a thriving ecosystem where innovative
                  startups can secure funding and drive growth in the global
                  economy.
                </p>
              </motion.div>
            </SpotlightCard>
          </div>
        </div>

        {/* Ethics Section */}
        <div className='text-center mb-6 md:mb-12 text-gray-900'>
          {/* <div className='inline-flex items-center justify-center px-4 py-1 mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-sm transform transition-transform duration-500 hover:scale-105'>
            <span className='font-medium text-blue-300'>Ethics</span>
          </div> */}
          <h2 className='text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4'>
            Our{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Ethics
            </span>
          </h2>
          <p className='text-gray-600 max-w-3xl mx-auto px-2'>
            The core values that guide our actions and decisions
          </p>
        </div>

        {/* Ethics Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8'>
          {ethics.map((item, index) => (
            <SpotlightCard
              key={index}
              className='group relative bg-gradient-to-br from-white to-gray-50 p-6 md:p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100'
              spotlightColor='rgba(200, 130, 230, 0.2)'
            >
              {/* Decorative background elements */}
              <div className='absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-50 to-blue-100 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:translate-x-6 group-hover:-translate-y-6 transition-transform duration-500'></div>
              <div className='absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-50 to-purple-100 rounded-full blur-2xl transform -translate-x-8 translate-y-8 group-hover:-translate-x-6 group-hover:translate-y-6 transition-transform duration-500'></div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className='relative'
              >
                <div className='flex items-center mb-4 md:mb-6'>
                  <div className='w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg flex items-center justify-center mr-3 md:mr-4 transform group-hover:scale-110 group-hover: transition-transform duration-300 shadow-sm group-hover:shadow-md'>
                    <div className='w-10 h-10 md:w-12 md:h-12 bg-gray-800 rounded-lg flex items-center justify-center transform group-hover: transition-transform duration-300'>
                      <span className='h-5 w-5 md:h-6 md:w-6 text-blue-100 group-hover:text-purple-100 transition-colors duration-300'>
                        {item.icon}
                      </span>
                    </div>
                  </div>
                  <h3 className='text-lg md:text-xl font-bold text-gray-800 group-hover:text-gray-950 transition-colors duration-300'>
                    {item.title}
                  </h3>
                </div>
                <p className='text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed'>
                  {item.description}
                </p>
              </motion.div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
