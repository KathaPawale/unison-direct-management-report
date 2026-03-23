import JourneySection from './JourneySection';
import VisionMission from './VisionMission';
import FAQ from './FAQ';

export default function About() {
  return (
    <div className='relative w-full min-h-screen'>
      <div className='relative z-10 pt-16 backdrop-blur-[1px]'>
        <JourneySection />
        <VisionMission />
        <FAQ />
      </div>
    </div>
  );
}
