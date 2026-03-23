// In app/not-found.tsx

import StyledButton from '@/src/components/StyledButton';

export default function NotFound() {
  return (
    // Use min-h-screen and padding for vertical spacing on all screen sizes
    <div className='flex flex-col items-center justify-center min-h-screen text-center px-4 sm:px-6 lg:px-8 bg-white pt-24 pb-12'>
      <div className='max-w-lg w-full'>
        {/* RESPONSIVE FONT SIZE: text-7xl on mobile, scales up to text-9xl on medium screens and above */}
        <h1 className='text-7xl sm:text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
          404
        </h1>

        {/* RESPONSIVE FONT SIZE: text-xl on mobile, scales up to text-3xl */}
        <h2 className='mt-4 text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800'>
          Oops! Page Not Found.
        </h2>

        {/* RESPONSIVE FONT SIZE: text-sm on mobile, scales up to text-base */}
        <p className='mt-2 text-sm sm:text-base text-gray-600 max-w-md mx-auto'>
          The page you&apos;re looking for might have been moved, renamed, or
          simply doesn&apos;t exist. Let&apos;s get you back on track.
        </p>

        {/* RESPONSIVE MARGIN: More space on larger screens */}
        <div className='mt-8 md:mt-10 flex justify-center'>
          <StyledButton to='/' size='lg'>
            Go to Homepage
          </StyledButton>
        </div>
      </div>
    </div>
  );
}
