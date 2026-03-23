'use client';

import { motion } from 'framer-motion';
import Lottie from 'lottie-react';

import EarthAnimation from '@/public/assets/EarthAnimation.json';
const logo = '/assets/ImpactfulPitchLogo.svg';
import { cn } from '../../../lib/utils';
const Growth = '/assets/hero-component/Growth.svg';
const Capital = '/assets/hero-component/Capital.svg';
const Vision = '/assets/hero-component/Vision.svg';
const Strategy = '/assets/hero-component/Strategy.svg';
const Idea = '/assets/hero-component/Idea.svg';
const Seed = '/assets/hero-component/Seed.svg';
const Series = '/assets/hero-component/Series.svg';
const IPO = '/assets/hero-component/IPO.svg';

const StartupJourneyVisualization = ({
  className,
  circleText,
  stageLabels,
  milestoneTexts,
  title,
  accentColor,
}) => {
  // --- DEFINE ANIMATION VARIANTS (Optional but clean) ---
  // This makes the animation logic reusable and easier to read.
  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 10 },
    visible: (delay) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        delay: delay, // Use the custom delay passed in
      },
    }),
  };
  return (
    <div
      className={cn(
        'relative h-[300px] w-full max-w-[500px] items-center lg:scale-105',
        className
      )}
    >
      {/* Connection Paths Between Stages */}
      <svg width='100%' height='45%' viewBox='0 5 200 42'>
        <g
          stroke='#ded1e7'
          fill='none'
          strokeWidth='0.4'
          strokeDasharray='100 100'
          pathLength='100'
        >
          {/* Path from Idea stage to center */}
          <path d='M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10' />
          {/* Path from Seed stage to center */}
          <path d='M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10' />
          {/* Path from Series stage to center */}
          <path d='M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10' />
          {/* Path from IPO stage to center */}
          <path d='M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10' />

          {/* Animation for connection paths */}
          <animate
            attributeName='stroke-dashoffset'
            from='100'
            to='0'
            dur='1s'
            fill='freeze'
            calcMode='spline'
            keySplines='0.25,0.1,0.5,1'
            keyTimes='0; 1'
          />
        </g>

        {/* Animated light effects along paths */}
        <g mask='url(#path-mask-idea)'>
          <circle
            className='herocomponent light-1'
            cx='0'
            cy='0'
            r='12'
            fill='url(#blue-animated-effect)'
          />
        </g>
        <g mask='url(#path-mask-seed)'>
          <circle
            className='herocomponent light-2'
            cx='0'
            cy='0'
            r='12'
            fill='url(#blue-animated-effect)'
          />
        </g>
        <g mask='url(#path-mask-series)'>
          <circle
            className='herocomponent light-3'
            cx='0'
            cy='0'
            r='12'
            fill='url(#blue-animated-effect)'
          />
        </g>
        <g mask='url(#path-mask-ipo)'>
          <circle
            className='herocomponent light-4'
            cx='0'
            cy='0'
            r='12'
            fill='url(#blue-animated-effect)'
          />
        </g>

        {/* Funding Stage Badges */}
        <g stroke='currentColor' fill='none' strokeWidth='0.4'>
          {/* Idea Stage Badge */}
          <g>
            <rect
              fill='url(#stage-gradient)'
              x='14'
              y='5'
              width='34'
              height='10'
              rx='5'
            />
            <image
              href={Idea}
              alt='Idea Icon'
              x='20'
              y='6'
              height={8}
              width={8}
            />
            <text
              x='29'
              y='12'
              fill='black'
              stroke='none'
              fontSize='5'
              fontWeight='500'
            >
              {stageLabels?.idea || 'Idea'}
            </text>
          </g>

          {/* Seed Stage Badge */}
          <g>
            <rect
              fill='url(#stage-gradient)'
              x='60'
              y='5'
              width='34'
              height='10'
              rx='5'
            />
            <image
              href={Seed}
              alt='Seed Icon'
              x='65'
              y='6'
              height={8}
              width={8}
            />
            <text
              x='74.5'
              y='12'
              fill='black'
              stroke='none'
              fontSize='5'
              fontWeight='500'
            >
              {stageLabels?.seed || 'Seed'}
            </text>
          </g>

          {/* Series Stage Badge */}
          <g>
            <rect
              fill='url(#stage-gradient)'
              x='108'
              y='5'
              width='34'
              height='10'
              rx='5'
            />
            <image
              href={Series}
              alt='Series Icon'
              x='112.5'
              y='6'
              height={8}
              width={8}
            />
            <text
              x='123'
              y='12'
              fill='black'
              stroke='none'
              fontSize='5'
              fontWeight='500'
            >
              {stageLabels?.series || 'Series'}
            </text>
          </g>

          {/* IPO Stage Badge */}
          <g>
            <rect
              fill='url(#stage-gradient)'
              x='150'
              y='5'
              width='40'
              height='10'
              rx='5'
            />
            <image
              href={IPO}
              alt='IPO Icon'
              x='160'
              y='6'
              height={8}
              width={8}
            />
            <text
              x='169'
              y='12'
              fill='black'
              stroke='none'
              fontSize='5'
              fontWeight='500'
            >
              {stageLabels?.ipo || 'IPO'}
            </text>
          </g>
        </g>

        <defs>
          {/* Path masks for light animations */}
          <mask id='path-mask-idea'>
            <path
              d='M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10'
              strokeWidth='0.5'
              stroke='white'
            />
          </mask>
          <mask id='path-mask-seed'>
            <path
              d='M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10'
              strokeWidth='0.5'
              stroke='white'
            />
          </mask>
          <mask id='path-mask-series'>
            <path
              d='M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10'
              strokeWidth='0.5'
              stroke='white'
            />
          </mask>
          <mask id='path-mask-ipo'>
            <path
              d='M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10'
              strokeWidth='0.5'
              stroke='white'
            />
          </mask>

          {/* Gradient for light effects */}
          <radialGradient id='blue-animated-effect' fx='1'>
            <stop offset='0%' stopColor={accentColor || '#8B5CF6'} />
            <stop offset='100%' stopColor='transparent' />
          </radialGradient>

          {/* Gradient for stage badges */}
          <linearGradient id='stage-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
            <stop offset='0%' stopColor='#F2D9FD' />
            <stop offset='100%' stopColor='#CFCDF9' />
          </linearGradient>
        </defs>
      </svg>

      {/* Central Hub Container */}
      <div className='absolute lg:bottom-9 bottom-[46px] flex w-full flex-col items-center'>
        {/* Drop shadow effect */}
        <div className='absolute -bottom-4 h-[100px] w-[62%] rounded-lg bg-accent/30' />

        {/* Logo badge at top */}
        <div className='absolute -top-3 z-20 flex items-center justify-center rounded-lg border border-[#b7ddfc] bg-white px-2 py-1 sm:-top-4 sm:py-1.5'>
          <img src={logo} alt='Impactful Pitch Logo' className='h-7.5' />
        </div>

        {/* Animated center element with extra half-circle decorative line */}
        <div className='absolute -bottom-9 z-30 grid h-[70px] w-[75px] place-items-center rounded-full bg-white font-semibold text-xs'>
          <div className='absolute w-32 z-30'>
            <Lottie
              animationData={EarthAnimation}
              loop={true}
              autoplay={true}
            />
          </div>
        </div>

        {/* Main content container */}
        <div className='relative z-10 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-lg border bg-white shadow-md'>
          {/* Milestone achievement badges */}
          {/* Vision Badge */}
          <motion.div
            className='absolute bottom-21 left-13 md:left-16 max-[400px]:left-9 z-10 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-black shadow-sm flex items-center px-2 md:px-3 h-6 md:h-7 text-[10px] md:text-xs gap-1 md:gap-2 max-[400px]:scale-80 md:scale-75 lg:scale-100'
            variants={badgeVariants}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.8 }}
            custom={0.4} // This is the delay value passed to the 'visible' variant
          >
            <img src={Vision} alt='Vision Icon' className='size-4 md:size-5' />
            <span>{milestoneTexts?.vision || 'Vision Clarified'}</span>
          </motion.div>

          {/* Strategy Badge */}
          <motion.div
            className='absolute bottom-5 right-5 md:right-6 max-[400px]:right-3 z-10 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-black shadow-sm flex items-center px-2 md:px-3 h-6 md:h-7 text-[10px] md:text-xs gap-1 md:gap-2 max-[400px]:scale-80 md:scale-75 lg:scale-100'
            variants={badgeVariants}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.8 }}
            custom={0.6} // Delay of 0.6s
          >
            <img
              src={Strategy}
              alt='Strategy Icon'
              className='size-4 md:size-5'
            />
            <span>{milestoneTexts?.strategy || 'Strategy Aligned'}</span>
          </motion.div>

          {/* Capital Badge */}
          <motion.div
            className='absolute bottom-18 right-13 md:right-14 max-[400px]:right-9 z-10 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-black shadow-sm flex items-center px-2 md:px-3 h-6 md:h-7 text-[10px] md:text-xs gap-1 md:gap-2 max-[400px]:scale-80 md:scale-75 lg:scale-100'
            variants={badgeVariants}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.8 }}
            custom={0.8} // Delay of 0.8s
          >
            <img
              src={Capital}
              alt='Capital Icon'
              className='size-4 md:size-5'
            />
            <span>{milestoneTexts?.capital || 'Capital Secured'}</span>
          </motion.div>

          {/* Growth Badge */}
          <motion.div
            className='absolute bottom-8 left-5 md:left-6 max-[400px]:left-3 z-10 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-black shadow-sm flex items-center px-2 md:px-3 h-6 md:h-7 text-[10px] md:text-xs gap-1 md:gap-2 max-[400px]:scale-80 md:scale-75 lg:scale-100'
            variants={badgeVariants}
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, amount: 0.8 }}
            custom={1} // Delay of 1s
          >
            <img src={Growth} alt='Growth Icon' className='size-4 md:size-5' />
            <span>{milestoneTexts?.growth || 'Growth Accelerated'}</span>
          </motion.div>

          {/* Pulsing ripple effect circles */}
          <motion.div
            className='absolute -bottom-15 h-[100px] w-[100px] rounded-full border-t  bg-accent/5'
            animate={{
              scale: [0.98, 1.02, 0.98, 1, 1, 1, 1, 1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className='absolute -bottom-20 h-[145px] w-[145px] rounded-full border-t bg-accent/5'
            animate={{
              scale: [1, 1, 1, 0.98, 1.02, 0.98, 1, 1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className='absolute -bottom-[100px] h-[190px] w-[190px] rounded-full border-t bg-accent/5'
            animate={{
              scale: [1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className='absolute -bottom-[120px] h-[235px] w-[235px] rounded-full border-t bg-accent/5'
            animate={{
              scale: [1, 1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
};

export default StartupJourneyVisualization;
