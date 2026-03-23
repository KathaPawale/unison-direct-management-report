'use client';

import { motion } from 'framer-motion';

export default function RefundPolicy() {
  return (
    <section className='z-10 pb-8 sm:pb-16 pt-28 backdrop-blur-[1px] px-2 sm:px-8'>
      <div className='max-w-4xl mx-auto'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mb-4 text-center'
        >
          <h1 className='text-3xl md:text-4xl font-bold text-gray-900'>
            Refund Policy
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className='bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-10 prose prose-lg max-w-none text-gray-700'
        >
          <div className='space-y-6'>
            <p>
              At Impactful Pitch, we deliver high-value strategic outcomes
              through pitch decks, financial models, business narratives, and
              fundraising advisory services. Our work involves significant
              intellectual effort, research, and consulting expertise. This
              policy ensures transparency while safeguarding the integrity of
              our service delivery process.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Refund Eligibility
            </h2>
            <p>
              Refunds are considered only in exceptional circumstances,
              including:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                If the project did not commence due to an internal lapse at
                Impactful Pitch
              </li>
              <li>If no work was initiated or delivered</li>
              <li>
                If the deliverable is substantially different from the agreed
                scope and the concern is raised within 3 days of receiving the
                first draft
              </li>
            </ul>
            <p>
              Once any stage of work has begun, refunds may be partial or not
              applicable based on project progress.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Non-Refundable Services
            </h2>
            <p>The following services are strictly non-refundable:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Any service where the first draft or milestone deliverable has
                been shared
              </li>
              <li>
                Consultation, advisory, or strategy sessions once completed
              </li>
              <li>
                Fundraising support once investor preparation or outreach begins
              </li>
              <li>Custom research, financial modeling, and narrative work</li>
              <li>Discounted or customized pricing engagements</li>
              <li>Delays caused by client-side feedback or unavailability</li>
            </ul>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Refund Request Process
            </h2>
            <p>
              Refund requests must be emailed to{' '}
              <a
                href='mailto:info@impactfulpitch.com'
                className='text-blue-600 hover:text-blue-800 underline'
              >
                info@impactfulpitch.com
              </a>{' '}
              within 3 days of delivery, including the project reference, reason
              for the request, and any supporting information. All requests
              undergo leadership-level review. A response will be shared within
              7 business days.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Refund Decision & Processing
            </h2>
            <p>
              If approved, refunds will be processed via the original payment
              method within 7–15 business days. Refund amounts, if any, will be
              calculated based on work already completed. Impactful Pitch
              reserves the right to decline refunds where substantial effort has
              been invested in line with the agreed scope.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Our Commitment
            </h2>
            <p>
              We encourage clients to share feedback and allow reasonable
              revisions before seeking refunds. Our priority is to build
              long-term, trust-driven relationships with founders while
              delivering excellence at every stage.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
