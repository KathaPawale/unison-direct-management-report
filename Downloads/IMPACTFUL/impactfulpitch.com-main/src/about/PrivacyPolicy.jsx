'use client';

import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
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
            Privacy Policy
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
            <p>
              This Privacy Policy governs the manner in which Impactful Pitch
              collects, uses, maintains and discloses information collected from
              users (each, a "User") of the https://www.impactfulpitch.com/
              website ("Site"). This privacy policy applies to the Site and all
              products and services offered by Impactful Pitch.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Personal identification information
            </h2>
            <p>
              We may collect personal identification information from Users in a
              variety of ways, including, but not limited to, when Users visit
              our site, register on the site, place an order, subscribe to the
              newsletter, fill out a form and in connection with other
              activities, services, features or resources we make available on
              our Site. Users may be asked for, as appropriate, name, email
              address, mailing address, phone number, credit card information.
              Users may, however, visit our Site anonymously. We will collect
              personal identification information from Users only if they
              voluntarily submit such information to us. Users can always refuse
              to supply personally identification information, except that it
              may prevent them from engaging in certain Site related activities.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Non-personal identification information
            </h2>
            <p>
              We may collect non-personal identification information about Users
              whenever they interact with our Site. Non-personal identification
              information may include the browser name, the type of computer and
              technical information about Users' means of connection to our
              Site, such as the operating system and the Internet service
              providers utilized and other similar information.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Web browser cookies
            </h2>
            <p>
              Our Site may use "cookies" to enhance User experience. User&apos;s
              web browser places cookies on their hard drive for record-keeping
              purposes and sometimes to track information about them. Users may
              choose to set their web browser to refuse cookies, or to alert you
              when cookies are being sent. If they do so, note that some parts
              of the Site may not function properly.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              How we use collected information
            </h2>
            <p>
              Impactful Pitch may collect and use Users personal information for
              the following purposes:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>To improve customer service</strong> - Information you
                provide helps us respond to your customer service requests and
                support needs more efficiently.
              </li>
              <li>
                <strong>To personalize user experience</strong> - We may use
                information in the aggregate to understand how our users as a
                group use the services and resources provided on our site.
              </li>
              <li>
                <strong>To improve our site</strong> - We may use feedback you
                provide to improve our products and services.
              </li>
              <li>
                <strong>To process payments</strong> - We may use the
                information Users provide about themselves when placing an order
                only to provide service to that order. We do not share this
                information with outside parties except to the extent necessary
                to provide the service.
              </li>
              <li>
                <strong>
                  To run a promotion, contest, survey or other site feature
                </strong>{' '}
                - To send Users information they agreed to receive about topics
                we think will be of interest to them.
              </li>
              <li>
                <strong>To send periodic emails</strong> - We may use the email
                address to send user information and updates pertaining to their
                order. It may also be used to respond to their inquiries,
                questions and/or other requests. If a user decides to opt-in to
                our mailing list, they will receive emails that may include
                company news, updates, related product or service information,
                etc. If at any time the user would like to unsubscribe from
                receiving future emails, they may do so by contacting us via our
                site.
              </li>
            </ul>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              How we protect your information
            </h2>
            <p>
              We adopt appropriate data collection, storage and processing
              practices and security measures to protect against unauthorized
              access, alteration, disclosure or destruction of your personal
              information, username, password, transaction information and data
              stored on our site.
            </p>
            <p>
              Sensitive and private data exchange between the Site and its users
              happens over a SSL secured communication channel and is encrypted
              and protected with digital signatures.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Sharing your personal information
            </h2>
            <p>
              We do not sell, trade, or rent users personal identification
              information to others. We may share generic aggregated demographic
              information not linked to any personal identification information
              regarding visitors and users with our business partners, trusted
              affiliates and advertisers for the purposes outlined above.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Changes to this privacy policy
            </h2>
            <p>
              Impactful Pitch has the discretion to update this privacy policy
              at any time. When we do, we will revise the updated date at the
              bottom of this page. We encourage Users to frequently check this
              page for any changes to stay informed about how we are helping to
              protect the personal information we collect. You acknowledge and
              agree that it is your responsibility to review this privacy policy
              periodically and become aware of modifications.
            </p>

            <h2 className='text-2xl font-bold text-gray-900 mt-8 mb-4'>
              Your acceptance of these terms
            </h2>
            <p>
              By using this site, you signify your acceptance of this policy and
              terms of service. If you do not agree to this policy, please do
              not use our site. Your continued use of the site following the
              posting of changes to this policy will be deemed your acceptance
              of those changes.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
