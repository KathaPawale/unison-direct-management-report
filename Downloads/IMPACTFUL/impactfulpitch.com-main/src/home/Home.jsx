import HeroSection from './HeroSection';
import SharkTank from './SharkTank';
import ServiceCards from './ServiceCards';
import Metrics from './Metrics';
import Clients from './Clients';
import SuccessStories from './SuccessStories';
import Partners from './Partners';
import ManBehind from './ManBehind';
import Media from './Media';
import BeforeAfterSlides from './BeforeAfterSlides';
import Testimonials from './Testimonials';

export default function Home() {
  return (
    <div className='relative w-full min-h-screen'>
      <div className='relative z-10 pt-16 backdrop-blur-[1px]'>
        <HeroSection />
        <SharkTank />
        <ServiceCards />
        <BeforeAfterSlides />
        <Metrics />
        <Clients />
        <Testimonials />
        <SuccessStories />
        <Partners />
        <ManBehind
          chipText='The Man Behind'
          normalHeading='Meet your'
          highlightedHeading='Expert Guide'
          description='30+ years of collective team proficiency in consulting startups'
        />
        <Media />
      </div>
    </div>
  );
}
