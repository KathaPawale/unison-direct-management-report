'use client';

import { motion } from 'framer-motion';

export default function TermsConditions() {
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
            Terms and Conditions
          </h1>
          {/* <p className="text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p> */}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className='bg-white rounded-xl shadow-md p-6 sm:p-8 md:p-10 prose prose-lg max-w-none text-gray-700'
        >
          <div className='space-y-6'>
            <h2 className='text-2xl font-bold text-gray-900 mb-4'>General</h2>
            <p>
              These terms and conditions ('Terms') set out the rights,
              obligations and restrictions that apply between the Customer and
              the Company when the Customer purchases the Company&apos;s
              services and accesses the Company&apos;s website and platform at
              https://www.impactfulpitch.com/ ("Platform") and/or accesses, uses
              or downloads any of the data and services provided by the Company.
            </p>
            <p>
              In order to use the Services, the Customer must (a) be 18 or
              older, or be 13 or older and have their parents' or guardians'
              consent to these Terms and (b) have the power to enter into a
              binding contract and not be barred from doing so under any
              applicable law. The Customer warrants that any information
              submitted to the Company is true, accurate and complete and the
              Customer agrees to keep it up to date at all times.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Formation of Contract
            </h2>
            <p>
              The Company offers various services, i.e. pitch deck designing,
              business plan, financials, mentoring('Services').
            </p>
            <p>
              The Company&apos;s Services are provided either on a case–by–case
              basis as ordered by the Customer or as a subscription service.
            </p>
            <p>
              The Customer places an order by uploading to the Platform draft
              slides containing text and/or graphics. The Company will contact
              you to discuss the requirements of the 'Customer'. According to
              the work that needs to be done, the Company quotes an approximate
              price and delivery time, which is an invitation to offer. It does
              not constitute an offer to sell and cannot be legally relied upon.
              By accepting the price quoted, the Customer makes an offer to buy.
              A contract for the Company&apos;s sale of the Services is formed
              when the Company accepts the Customer&apos;s offer in writing.
            </p>
            <p>
              When agreeing to the quoted price, the Customer enters into a
              binding and irrevocable agreement. The Customer will have to pay
              an advance as quoted by the Company before the commencement of the
              work and the rest will be paid at the delivery of the
              presentation.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Services and Delivery
            </h2>
            <p>
              The Company delivers the Services via email to the deadline agreed
              with the Customer. Upon delivery of the Services, the Customer is
              entitled to two revisions of the Services free of charge.
              Additional revisions will be billed at a rate that will be
              determined by the Company with the amount of work needed to be
              done.
            </p>
            <p>
              After the second revision, requests made by the Customer for work
              to be carried out on the Services delivered and revised will be
              billed at a separate rate. The Company will inform the Customer of
              the price before commencing the work.
            </p>
            <p>
              Free revision of Services delivered does not include any
              incorporation of new ideas of the Customer.
            </p>
            <p>
              Delivery of the Services is made in a .ppt or .pptx file or in any
              other formats specified by the Customer when placing an order and
              will be available immediately after approval of the slides. The
              Customer approves the Services either after the first delivery or
              after the first or second revision.
            </p>
            <p>
              In order to maintain efficiency in the Company&apos;s business, if
              the Customer has not responded by the Company&apos;s third attempt
              to contact the Customer to have the Services and/or revisions
              approved, the Company will consider the Services and any revisions
              approved and the Customer&apos;s payment card will be charged in
              accordance with the below chapter on payment.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Payment
            </h2>
            <p>
              The Customer pays per delivery. Payment for the Services falls due
              immediately upon the Customer&apos;s approval of the slides on the
              Platform, or upon the Company&apos;s third attempt to contact the
              Customer to have the Services and/or revisions approved, as the
              case may be.
            </p>
            <p>
              Credit packages fall due immediately when placing an order for a
              package.
            </p>
            <p>
              The payment card provided by the Customer at the time of purchase
              is charged on the due date as specified above.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Waiver of Statutory Right to Cancel the Purchase
            </h2>
            <p>
              This section applies exclusively to customers acting as consumers.
            </p>
            <p>
              Normally, a cancellation period of 14 days from the day of
              purchase applies to a contract for the supply of digital content.
            </p>
            <p>
              However, when the Customer places an order for the delivery of
              Services, the Customer requests the Company to begin the supply of
              digital content during the 14 day cancellation period applicable.
              Thus, the Customer acknowledges and agrees the payment made and
              that the Customer will not be entitled to receive a refund of
              their payment. The initial amount (the advance) will not be
              refunded under any circumstances.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Usage Policy
            </h2>
            <p>
              The Company may impose limits on certain features and services or
              restrict the Customer&apos;s access to parts or all of the
              Services without liability. Where these changes or suspensions
              would amount to a termination of the Services, the Customer may be
              entitled to a refund of the reasonable part of any charges paid by
              the Customer.
            </p>
            <p>
              The Customer can reproduce, publish, transmit, distribute,
              license, publicly display, rent or lend, modify, any data
              delivered by the Company, sell or participate in the sale of any
              of the Services provided by the Company.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Availability of Services
            </h2>
            <p>
              The Company endeavors to offer a smooth and reliable service but
              gives no guarantee, and does not warrant, that the Services and
              the Platform will be free of fault or that the Platform will be
              uninterrupted. If a fault does occur, the Customer may report it
              to Customer Services, and the Company will attempt to correct the
              fault as quickly as possible.
            </p>
            <p>
              The Company will occasionally restrict access to the Platform to
              carry out repairs, maintenance or to introduce new functionality
              or services and the Company will endeavor to keep disruption to a
              minimum.
            </p>
            <p>
              New services are subject to a period of testing. This means that
              new services may not perform with complete functionality, may be
              undergoing testing, may be inconsistently available, may have
              software “bugs” being fixed and may have other issues affecting
              availability and functionality.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Legal Protection and Waiver of Liability
            </h2>
            <p>
              THE USE OF THE SERVICES IS AT THE CUSTOMER’S SOLE RISK. THE
              SERVICES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS. THE
              COMPANY EXPRESSLY DISCLAIMS ALL REPRESENTATIONS, WARRANTIES AND
              STATUTORY REMEDIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, TO THE
              MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, INCLUDING, BUT NOT
              LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE AND NON-INFRINGEMENT. TO THE MAXIMUM EXTENT
              PERMITTED BY APPLICABLE LAW, THE COMPANY MAKES NO WARRANTY THAT
              (i) THE SERVICES WILL MEET THE CUSTOMER’S REQUIREMENTS; (ii)
              DELIVERY OF ANY PORTION OF THE SERVICES WILL BE UNINTERRUPTED,
              TIMELY, SECURE, OR FREE OF ERROR; (iii) THE RESULTS THAT MAY BE
              OBTAINED FROM THE USE OF SERVICES WILL BE ACCURATE OR RELIABLE;
              (iv) THE QUALITY OF ANY SLIDES, PRODUCTS, SERVICES, INFORMATION,
              OR OTHER MATERIAL PURCHASED OR OBTAINED BY THE CUSTOMER THROUGH
              THE SERVICES WILL MEET THE CUSTOMER’S EXPECTATIONS; (v) ANY
              PORTION OF THE SERVICES WILL BE OF SATISFACTORY QUALITY OR FREE OF
              FAULTS OR UNINTERRUPTED OR SATISFY ANY CONDITIONS OF QUALITY AND
              FITNESS FOR PURPOSE. NO ADVICE OR INFORMATION, WHETHER ORAL OR
              WRITTEN, OBTAINED BY THE CUSTOMER FROM THE COMPANY SHALL CREATE
              ANY WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.
            </p>
            <p>
              Under no circumstances will the Company, any subsidiaries and
              affiliates, suppliers, and their respective owners, officers,
              managers, members, agents and employees, be liable to the Customer
              for loss of profits, business interruptions, loss of business
              information, loss of business, opportunity or other pecuniary
              loss, loss of data or any direct, indirect, incidental,
              consequential, special, exemplary, or punitive damages or losses,
              whether based in contract, tort or otherwise, arising out of or in
              connection with the use of, or inability to use, the Services, any
              content delivered to the Customer, whether or not the Company has
              been advised of the possibility of such damages or loss. In any
              event, the Company’s liability to the Customer shall be limited to
              typical and foreseeable damage and shall not exceed the fees for a
              3 months subscription period.
            </p>
            <p>
              The Customer agrees to indemnify and hold harmless, and upon
              request, defend, (1) the Company, its affiliates and its
              respective directors, officers and employees; and (2) the
              providers of the data, from and against any and all losses,
              liabilities, damages, costs or expenses (including reasonable
              attorneys’ fees and costs) arising out of any claim, action, or
              proceeding brought by a third party based on a breach of any
              warranty, representation, covenant or obligation by the Customer
              under these Terms.
            </p>
            <p>
              The Company may assign its rights and obligations under these
              Terms to any new provider of the Services, without the prior
              consent of the Customer.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Termination of Contract
            </h2>
            <p>
              These Terms will continue to apply until terminated by either of
              the parties. The Company may terminate the Terms or suspend access
              to the Platform at any time. If the Customer or the Company
              terminates the Terms, or if the Company suspends the Customer’s
              access to the Platform, the Company shall have no liability or
              responsibility and the Company will not refund any amount paid by
              the Customer, unless specifically provided otherwise elsewhere in
              these Terms.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Trademarks and Amendment of Contract
            </h2>
            <p>
              All trademarks, logos, designs and images used in connection with
              the Platform and Services remain the property of the Company or
              their respective owners.
            </p>
            <p>
              The Company may amend these Terms at any time by posting the
              amended terms on its Platform. It is the Customer’s responsibility
              to review these Terms from time to time to check if they have been
              amended. The effective date of each new version of the Terms will
              be included at the top of the Terms page. By continuing to use the
              platform after any amended terms have been posted, the Customer
              will demonstrate that they accept the updated Terms. Should the
              Customer not accept these amendments, the Customer may terminate
              the subscription or the credit package.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Dispute Resolution, Applicable Law and Legal Venue
            </h2>
            <p>
              These Terms shall be governed by the laws of India without regard
              to its conflict of law provisions. Any lawsuits between the
              parties to this contract can only be filed to and brought before
              the court of India, which is the only applicable legal venue for
              any dispute between the parties.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
