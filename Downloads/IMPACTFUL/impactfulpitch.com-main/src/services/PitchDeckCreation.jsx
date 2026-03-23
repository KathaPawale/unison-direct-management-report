import StyledButton from '../components/StyledButton';

const PitchDeckCreationImage = '/assets/services/PitchDeckCreationImage.webp';

export default function PitchDeckCreation() {
  // Features list for pitch deck service
  const pitchDeckFeatures = [
    'Customized, narrative-driven pitch decks',
    'Visually appealing designs tailored to your brand',
    'Investor-focused content highlighting traction, team and market',
    'Clarity on business model, financials and growth strategy',
    'Designed to match early-stage to growth-stage needs',
  ];

  return (
    <div className='w-full py-8 relative overflow-hidden bg-white'>
      <div className='container mx-auto px-6 md:px-8 relative z-10'>
        <div className='flex flex-col-reverse lg:flex-row gap-6 items-center'>
          {/* Left Column - Content */}
          <div className='flex flex-col lg:w-1/2'>
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
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>

              <h2 className='text-4xl font-bold mb-6 text-gray-900 leading-tight'>
                Pitch Deck Creation &{' '}
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
                  Optimization
                </span>
              </h2>
            </div>

            {/* <div className="bg-white rounded-full py-2 px-6 shadow-md inline-block mb-6 w-max">
              <span className="text-gray-700 text-sm font-medium">Professional Pitch Deck Service</span>
            </div> */}

            <p className='text-lg text-gray-700 mb-6 leading-relaxed'>
              We create investor-ready pitch decks that combine compelling
              storytelling, clean design and strategic insight. Our decks are
              tailored to showcase your vision, traction and potential — all in
              a format that investors expect.
            </p>

            <ul className='space-y-3 mb-8'>
              {pitchDeckFeatures.map((item, index) => (
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
                Let&apos;s Build your Winning Deck
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
              {/* <StyledButton
                href="#samples"
                variant="secondary"
                size="lg"
              >
                View Samples
              </StyledButton> */}
            </div>
          </div>

          {/* Right Column - Dashboard Image */}
          <div className='relative lg:w-1/2'>
            <div className='bg-white rounded-3xl shadow-xl transform hover:rotate-1 transition-transform duration-300'>
              <img
                src={PitchDeckCreationImage}
                alt='Pitch Deck Creation'
                loading='lazy'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
