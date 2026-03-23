const WiseLife = '/assets/shark-tank/WiseLife.webp';
const Motion = '/assets/shark-tank/Motion.webp';
const Zoivane = '/assets/shark-tank/Zoivane.webp';
const Ring7 = '/assets/shark-tank/Ring7.webp';
const SneakInn = '/assets/shark-tank/SneakInn.webp';
const JaipurWatch = '/assets/shark-tank/JaipurWatch.webp';
const SharkTankLogo = '/assets/shark-tank/SharkTankLogo.webp';

// Reusable component to fix the iOS rendering bug
const GridImage = ({ src, alt }) => {
  return (
    // Outer div handles clipping and border-radius
    <div className='rounded-2xl overflow-hidden'>
      {/* Inner img handles the scaling transform */}
      <img
        src={src}
        alt={alt}
        loading='lazy'
        className='w-full h-full object-cover duration-500 transition-transform hover:scale-103'
      />
    </div>
  );
};

export default function SharkTank() {
  return (
    <section className='pt-4 mb-4 px-4 sm:px-6 md:px-8 relative bg-white'>
      <div className='max-w-7xl mx-auto relative z-10'>
        <div className='text-center'>
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
                d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
              />
            </svg>
            <span className='font-medium text-blue-300'>
              Our Shark Tank Portfolio
            </span>
          </div>
          <h2 className='text-4xl md:text-5xl font-bold pb-4 text-gray-900'>
            Trusted by Sharks,{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Guided by Us
            </span>
          </h2>
          <p className='text-gray-600 max-w-3xl mx-auto mb-6'>
            Startups that conquered the Shark Tank and soared with Impactful
            Pitch
          </p>
        </div>

        <div className='mb-12 mt-4 mx-auto'>
          {/* --- RESPONSIVE FIX 1: The main grid now breaks at `md` instead of `lg` --- */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-2'>
            {/* Left section - Shark Tank Logo */}
            {/* --- RESPONSIVE FIX 2: Constrain the logo size on mobile/tablet --- */}
            <div className='bg-black rounded-xl overflow-hidden flex items-center justify-center'>
              {/* Padding controls the logo size. It's smaller on mobile and fills more space on desktop. */}
              <img
                src={SharkTankLogo}
                alt='Shark Tank Logo'
                loading='lazy'
                className='w-full transition-transform duration-500 scale-103 hover:scale-106 px-2'
              />
            </div>

            {/* Right section - Project examples */}
            {/* --- RESPONSIVE FIX 3: The column span also activates at `md` --- */}
            <div className='md:col-span-3 grid grid-cols-2 sm:grid-cols-3 grid-rows-2 gap-4 transform-gpu'>
              <GridImage src={WiseLife} alt='WiseLife' />
              <GridImage src={Motion} alt='Motion Automotive' />
              <GridImage src={Zoivane} alt='Zoivane Pets' />
              <GridImage src={Ring7} alt='7 Ring' />
              <GridImage src={SneakInn} alt='SneakInn' />
              <GridImage src={JaipurWatch} alt='Jaipur Watch Company' />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
