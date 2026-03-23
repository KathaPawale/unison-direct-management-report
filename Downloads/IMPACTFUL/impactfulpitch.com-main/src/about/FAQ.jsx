'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus } from 'react-icons/fi';

// FAQ Item component with enhanced animations
const FAQItem = ({ question, answer, isOpen, toggleOpen, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className='group relative'
    >
      <div
        className={`
            relative overflow-hidden rounded-xl
            backdrop-blur-[8px] transition-all duration-300 ease-out
            ${
              isOpen
                ? 'bg-white/15 shadow-lg border-white/20'
                : 'bg-white/5 hover:bg-white/10 border-white/10'
            }
            mb-4 border-[0.5px]
            hover:shadow-md transform transition-all
            group-hover:-translate-y-0.5
        `}
      >
        <button
          className={`w-full flex items-center justify-between p-4 md:p-5 text-left focus:outline-none ${isOpen ? 'pb-2 md:pb-3' : ''}`}
          onClick={toggleOpen}
        >
          <span
            className={`
                text-sm md:text-[16px] font-medium flex-1 pr-3 md:pr-4
                transition-colors duration-300 leading-relaxed
                ${
                  isOpen
                    ? 'text-slate-800'
                    : 'text-slate-600 group-hover:text-slate-800'
                }
            `}
          >
            {question}
          </span>

          <div
            className={`
                            w-6 h-6 md:w-7 md:h-7 flex items-center justify-center flex-shrink-0
                            transition-all duration-300 transform
                            ${isOpen ? 'rotate-45' : ''}
                        `}
          >
            <FiPlus className='text-sm md:text-base transition-all duration-300 text-slate-700' />
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: { duration: 0.3, ease: 'easeOut' },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: { duration: 0.2 },
              }}
            >
              <div className='px-4 md:px-5'>
                <div className='bg-white/5 backdrop-blur-sm rounded-lg p-4 md:p-5 pt-0'>
                  <p className='text-slate-600 text-xs md:text-[14px] leading-relaxed'>
                    <span dangerouslySetInnerHTML={{ __html: answer }} />
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default function FAQ() {
  const [openFAQ, setOpenFAQ] = useState(null);

  // FAQ data
  const faqs = [
    {
      question: 'What is the procedure to start a new startup in India?',
      answer: `Steps to Register Your Startup:<br/>
                    &bull; Step 1: Incorporate your Business<br/>
                    &bull; Step 2: Register with Startup India<br/>
                    &bull; Step 3: Get DPIIT Recognition<br/>
                    &bull; Step 4: Recognition Application<br/>
                    &bull; Step 5: Documents for Registration<br/>
                    &bull; Step 6: Recognition Number<br/>
                    &bull; Step 7: Other Areas`,
    },
    {
      question:
        'What are the things that need to be considered when starting a new business?',
      answer: `Starting a new business involves several critical considerations. Firstly, thorough market research is essential to understand your target audience, competition and industry trends. Next, you'll need to develop a comprehensive business plan outlining your goals, financial projections and operational strategies. Choosing the right legal structure, such as a sole proprietorship or LLC, is crucial for liability protection and tax implications.<br/><br/>
                    Securing funding through personal savings, loans, or investors is often necessary to finance your venture. Building a strong brand identity and obtaining any necessary licenses or permits are also key steps. Additionally, selecting a suitable location and defining your product or service offering are vital for success.<br/><br/>
                    Implementing effective marketing and sales strategies, building a talented team and investing in technology and infrastructure will further support your business. It&apos;s important to manage risks, ensure compliance with regulations, prioritize customer experience and remain adaptable to changing market conditions.`,
    },
    {
      question: 'How can I raise funds for doing business?',
      answer: `Raising funds for a business venture typically involves exploring various avenues to secure the necessary capital. One option is self-funding, where entrepreneurs use personal savings or assets to finance their business.<br/><br/>
                    Another common approach is seeking external funding from investors, which can include angel investors, venture capitalists, or crowdfunding platforms. These investors provide capital in exchange for equity in the company or a share of future profits.<br/><br/>
                    Additionally, small business loans from banks or financial institutions are a popular choice for entrepreneurs who prefer to retain full ownership of their business.<br/><br/>
                    Government grants or subsidies may also be available for specific industries or regions, offering non-repayable funding to support business growth. Ultimately, the most suitable funding method will depend on factors such as the business&apos;s stage of development, financial needs and risk tolerance. It&apos;s essential to carefully evaluate each option and develop a compelling pitch to attract potential investors or lenders.`,
    },
    {
      question: 'What are the types of pitch decks?',
      answer: `Pitch decks come in various forms, each tailored to meet specific needs and objectives. The most common types include:<br/><br/>
                    <strong>Investor Pitch Deck</strong>: Designed to secure funding from investors, this type of pitch deck typically highlights the business opportunity, market potential, team expertise, financial projections and investment proposition.<br/><br/>
                    <strong>Sales Pitch Deck</strong>: Used to showcase products or services to potential customers, a sales pitch deck emphasizes the unique value proposition, key features, benefits and pricing to persuade prospects to make a purchase.<br/><br/>
                    <strong>Partnership Pitch Deck</strong>: Aimed at forging strategic partnerships or collaborations with other businesses, this type of pitch deck focuses on mutually beneficial opportunities, shared goals and the potential for synergy between the parties involved.<br/><br/>
                    <strong>Recruitment Pitch Deck</strong>: Created to attract top talent to join the company, a recruitment pitch deck highlights the company culture, growth opportunities, benefits and why candidates should consider working for the organization.<br/><br/>
                    <strong>Internal Pitch Deck</strong>: Used for internal purposes within the company, this type of pitch deck may cover topics such as strategic initiatives, project updates, performance metrics, or new product launches to align teams and stakeholders.<br/><br/>
                    Each type of pitch deck serves a specific purpose and requires careful planning and customization to effectively communicate the intended message and achieve desired outcomes.`,
    },
    {
      question: 'How do I structure a startup investment pitch deck?',
      answer: `Structuring a startup investment pitch deck is crucial to effectively communicate your business idea and secure potential investors' interest. Here&apos;s a recommended structure:<br/><br/>
                    &bull; <strong>Introduction</strong>: Elevator pitch to capture attention.<br/>
                    &bull; <strong>Problem & Solution</strong>: Define the problem and present your unique solution.<br/>
                    &bull; <strong>Market Opportunity</strong>: Highlight market size and growth potential.<br/>
                    &bull; <strong>Traction</strong>: Showcase key milestones and achievements.<br/>
                    &bull; <strong>Business Model</strong>: Outline revenue generation strategy.<br/>
                    &bull; <strong>Team</strong>: Introduce key team members and their expertise.<br/>
                    &bull; <strong>Financials</strong>: Present concise financial projections.<br/>
                    &bull; <strong>Funding Ask</strong>: Specify investment amount and use of funds.<br/>
                    &bull; <strong>Appendix</strong>: Optional: Additional data, product visuals, testimonials.<br/>
                    Craft each section with clarity and impact to deliver a compelling pitch.`,
    },
    {
      question:
        'What is the difference b/w the presentation and the pitch deck?',
      answer: `The main difference between a presentation and a pitch deck lies in their purpose and content.<br/><br/>
                    A presentation is a broader term used for any visual communication tool, while a pitch deck is a specific type of presentation designed to pitch an idea, product, or business opportunity to a specific audience, such as investors or clients.<br/><br/>
                    Pitch decks typically follow a structured format and include key elements like problem statement, solution, market opportunity, business model and team overview, aiming to secure support or investment.<br/><br/>
                    Presentations can vary widely in content and format, serving different purposes such as informing, educating, or persuading.`,
    },
  ];

  // Toggle FAQ open/close
  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <section className='py-4 px-4 md:px-8 relative'>
      <div className='max-w-3xl mx-auto relative z-10'>
        {/* Header - Mobile responsive */}
        <div className='text-center mb-6 md:mb-8'>
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
                d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span className='font-medium text-blue-300'>FAQs</span>
          </div>

          {/* Mobile layout for header */}
          <div className='flex justify-center items-center'>
            <h2 className='text-3xl text-center md:text-[42px] font-bold text-gray-800 md:ml-4 md:px-2'>
              Frequently Asked{' '}
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
                Questions
              </span>
            </h2>
          </div>
        </div>

        {/* FAQ List with mobile responsive styling */}
        <motion.div
          className='mb-8 md:mb-12'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openFAQ === index}
              toggleOpen={() => toggleFAQ(index)}
              index={index}
            />
          ))}
        </motion.div>

        {/* Contact section with mobile responsive text */}
        <div className='text-center my-2 text-gray-400 px-4'>
          <p className='text-sm md:text-base'>
            Contact us at{' '}
            <a
              href='mailto:info@impactfulpitch.com'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-500 hover:text-violet-600 transition-colors break-all'
            >
              info@impactfulpitch.com
            </a>{' '}
            via email!
          </p>
        </div>
      </div>
    </section>
  );
}
