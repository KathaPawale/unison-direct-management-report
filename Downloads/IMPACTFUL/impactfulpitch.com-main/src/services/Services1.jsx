const Rocket = '/assets/rocket.svg';

export default function ServicesSection1() {
  return (
    <div className='w-full pt-16 pb-6 relative overflow-hidden bg-white'>
      <div className='container mx-auto px-6 md:px-8 text-center relative z-10'>
        <div className='flex flex-col items-center'>
          <div className='inline-flex items-center justify-center px-4 py-1 mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-sm transform transition-transform duration-500 hover:scale-105'>
            <img
              src={Rocket}
              alt='Rocket Icon'
              className='h-[18px] w-[18px] mr-2'
            />
            <span className='font-medium text-blue-300'>Our Services</span>
          </div>

          <h1 className='text-4xl md:text-5xl font-bold mb-6 text-gray-900'>
            Comprehensive{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Suite of Services
            </span>
          </h1>

          <p className='text-lg md:text-xl text-gray-700 max-w-3xl'>
            From Passionate Idea to Investment Powerhouse
            <br />
            with Pitch Decks, Funding and Growth Strategies
          </p>
        </div>
      </div>
    </div>
  );
}
