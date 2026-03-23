import StyledButton from '../components/StyledButton';

const FounderGroomingImage = '/assets/services/FounderGroomingImage.webp';

export default function FounderGrooming() {
  // Founder services array
  const founderServices = [
    'Expert coaching on storytelling and delivery',
    'Presentation training for investor pitches and demo days',
    'Anticipated Q&A with objection handling strategies',
    'Strategic refinement of messaging and flow',
    'Investor psychology insights to build trust',
  ];

  return (
    <div className='w-full py-8 relative overflow-hidden bg-white'>
      <div className='container mx-auto px-6 md:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
          {/* Left Column - Stats and Image */}
          <div className='relative'>
            <div className='bg-white rounded-3xl p-5 shadow-xl transform hover:rotate-1 transition-transform duration-300'>
              <img
                src={FounderGroomingImage}
                alt="Founders' Grooming"
                loading='lazy'
              />
            </div>
          </div>

          {/* Right Column - Content */}
          <div className='flex flex-col'>
            <div className='flex gap-5 items-center'>
              <div className='w-20 h-20 p-4 bg-white shadow-lg rounded-2xl mb-6 flex items-center justify-center transform hover:rotate-6 transition-transform duration-300'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-full w-full text-blue-500'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              </div>

              <h2 className='text-4xl font-bold mb-6 text-gray-900 leading-tight'>
                Founders'{' '}
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
                  Grooming
                </span>
              </h2>
            </div>

            <p className='text-lg text-gray-700 mb-6 leading-relaxed'>
              We coach founders to pitch with clarity and confidence. From
              narrative refinement to handling tough investor questions, we
              ensure you're fully prepared for critical meetings and demo days.
            </p>

            <ul className='space-y-3 mb-8'>
              {founderServices.map((item, index) => (
                <li key={index} className='flex items-center text-gray-700'>
                  <div className='w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-3'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-4 w-4 text-blue-500'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                    >
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <div className='flex flex-wrap gap-4 justify-center md:justify-start'>
              <StyledButton
                href='https://calendly.com/teamnikhilparmar/20min?back=1'
                size='lg'
              >
                Ready to Pitch like a Pro?
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-5 w-5 ml-2'
                  viewBox='0 0 20 20'
                  fill='currentColor'
                >
                  <path
                    fillRule='evenodd'
                    d='M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z'
                    clipRule='evenodd'
                  />
                </svg>
              </StyledButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
