'use client';

'use client';
import React, { useEffect, useRef } from 'react';
// import { motion } from "framer-motion";

export const TestimonialsColumn = (props) => {
  const { className = '', testimonials, duration = 10 } = props;
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set up CSS animation
    const animationName = `scroll-${Math.random().toString(36).substr(2, 9)}`;

    // Create keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${animationName} {
        0% { transform: translateY(0%); }
        100% { transform: translateY(-50%); }
      }
    `;
    document.head.appendChild(style);

    // Apply animation
    const motionDiv = container.querySelector('.scroll-container');
    if (motionDiv) {
      motionDiv.style.animation = `${animationName} ${duration}s linear infinite`;
    }

    const handleMouseEnter = () => {
      if (motionDiv) {
        motionDiv.style.animationPlayState = 'paused';
      }
    };

    const handleMouseLeave = () => {
      if (motionDiv) {
        motionDiv.style.animationPlayState = 'running';
      }
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.head.removeChild(style);
    };
  }, [duration]);

  return (
    <div ref={containerRef} className={className}>
      <div className='scroll-container flex flex-col gap-6 pb-6'>
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {testimonials.map(({ quote, name, position, image }, i) => (
                <div
                  className='p-10 rounded-3xl border shadow-lg shadow-primary/10 max-w-xs w-full bg-white'
                  key={i}
                >
                  <div className='text-gray-900'>"{quote}"</div>
                  <div className='flex items-center gap-2 mt-5'>
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      loading='lazy'
                      className='h-10 w-10 rounded-full'
                    />
                    <div className='flex flex-col'>
                      <div className='font-medium tracking-tight leading-5 text-gray-900'>
                        {name}
                      </div>
                      <div className='leading-5 opacity-60 tracking-tight text-gray-700'>
                        {position}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </div>
    </div>
  );
};
