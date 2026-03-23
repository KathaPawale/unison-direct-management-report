import ServicesSection1 from './Services1';
import PitchDeckCreation from './PitchDeckCreation';
import BusinessPlan from './BusinessPlan';
import FinancialModelling from './FinancialModelling';
import FounderGrooming from './FounderGrooming';
import InvestorNetwork from './InvestorNetwork';
import VideoPitch from './VideoPitch';
import Process from './Process';

export default function Services() {
  return (
    <div className='relative w-full min-h-screen'>
      <div className='z-10 pt-16 backdrop-blur-[1px]'>
        <ServicesSection1 />
        <PitchDeckCreation />
        <BusinessPlan />
        <FinancialModelling />
        <FounderGrooming />
        <InvestorNetwork />
        <VideoPitch />
        <Process />
      </div>
    </div>
  );
}
