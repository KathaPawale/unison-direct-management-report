'use client';

import { useState } from 'react';
import StyledButton from '@/src/components/StyledButton';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function Contact() {
  // State for form fields
  const [reason, setReason] = useState('');
  const [services, setServices] = useState([]);
  const [otherReason, setOtherReason] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // null, 'success', 'error'

  const submitContact = useMutation(api.contacts.submitContact);

  // Available services
  const availableServices = [
    'Pitch Deck Creation & Optimization',
    'Business Plan Development',
    'Financial Modelling & Business Valuation',
    'Investor Network Access',
    "Founders' Grooming",
    'Video Pitch Deck',
  ];

  // Handle service selection
  const handleServiceToggle = (service) => {
    if (services.includes(service)) {
      setServices(services.filter((s) => s !== service));
    } else {
      setServices([...services, service]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Prepare reason for submission
    let finalReason = reason;
    if (reason === 'Service' && services.length > 0) {
      finalReason = `Service: ${services.join(', ')}`;
    } else if (reason === 'Other' && otherReason) {
      finalReason = otherReason;
    } else if (
      (reason === 'Service' || reason === 'Partnership') &&
      companyName
    ) {
      finalReason = `${reason} - ${companyName}`;
    }

    try {
      await submitContact({
        name,
        email,
        reason: finalReason,
        message: message || 'No additional message provided.',
      });

      setSubmitStatus('success');

      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');

      // Clear error status after 3 seconds
      setTimeout(() => {
        setSubmitStatus(null);
      }, 3000);

      setIsSubmitting(false);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setReason('');
    setServices([]);
    setOtherReason('');
    setCompanyName('');
    setEmail('');
    setName('');
    setMessage('');
    setSubmitStatus(null);
    setIsSubmitting(false);
  };

  return (
    <div className='min-h-screen pt-24 pb-16 z-10 backdrop-blur-[1px] px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white'>
      <div className='max-w-7xl mx-auto'>
        {/* Header Section */}
        <div className='text-center mb-12'>
          <h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-4'>
            Get in{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500'>
              Touch
            </span>
          </h1>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            Have a question or want to work with us? <br />
            Fill out the form below and we'll get back to you at the earliest
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
          {/* Contact Information */}
          <div className='bg-gradient-to-br from-purple-300 to-blue-300 rounded-2xl p-8 text-black shadow-xl'>
            <h2 className='text-2xl font-bold mb-6'>Contact Information</h2>

            <div className='space-y-6'>
              <div className='flex items-start'>
                <a
                  className='flex-shrink-0 bg-white/20 p-3 rounded-full'
                  href='mailto:info@impactfulpitch.com'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-6 w-6'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                    />
                  </svg>
                </a>
                <div className='ml-4'>
                  <h3 className='text-lg font-semibold'>Email</h3>
                  <a className='mt-1' href='mailto:info@impactfulpitch.com'>
                    info@impactfulpitch.com
                  </a>
                </div>
              </div>

              <div className='flex items-start'>
                <a
                  className='flex-shrink-0 bg-white/20 p-3 rounded-full'
                  href='tel:+918490999236'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-6 w-6'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                    />
                  </svg>
                </a>
                <div className='ml-4'>
                  <h3 className='text-lg font-semibold'>Phone</h3>
                  <a className='mt-1' href='tel:+918490999236'>
                    +91 8490999236
                  </a>
                </div>
              </div>

              <div className='flex items-start'>
                <div className='flex-shrink-0 bg-white/20 p-3 rounded-full'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-6 w-6'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                    />
                  </svg>
                </div>
                <div className='ml-4'>
                  <h3 className='text-lg font-semibold'>Location</h3>
                  <p className='mt-1'>- Mumbai, Maharashtra</p>
                  <p className='mt-1'>- Vadodara, Gujarat</p>
                  {/* <p className="mt-1"><strong>Head Quarter:</strong> Mumbai</p> */}
                  {/* <p className="mt-1"><strong>Branch Office:</strong> Bhayli, Vadodara</p> */}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className='bg-white rounded-2xl shadow-xl p-8'>
            {submitStatus === 'success' ? (
              <div className='text-center py-12'>
                <div className='bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-10 w-10 text-green-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                </div>
                <h3 className='text-2xl font-bold text-gray-900 mb-2'>
                  Thank You!
                </h3>
                <p className='text-gray-600'>
                  Your message has been sent successfully. We'll get back to you
                  soon.
                </p>
              </div>
            ) : (
              <div className='space-y-6'>
                {/* Name field */}
                <div>
                  <label
                    htmlFor='name'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Your Name
                  </label>
                  <input
                    type='text'
                    id='name'
                    value={name}
                    autoComplete='on'
                    onChange={(e) => setName(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-300'
                    placeholder='Enter your full name'
                    required
                  />
                </div>

                {/* Email field */}
                <div>
                  <label
                    htmlFor='email'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Your Email
                  </label>
                  <input
                    type='email'
                    id='email'
                    value={email}
                    autoComplete='on'
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-300'
                    placeholder='Enter your email address'
                    required
                  />
                </div>

                {/* Reason field */}
                <div>
                  <label
                    htmlFor='reason'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Reason to connect?
                  </label>
                  <select
                    id='reason'
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-300 text-gray-800'
                    required
                  >
                    <option value='' disabled className='text-gray-600'>
                      Select a reason
                    </option>
                    <option value='Service' className='text-gray-900'>
                      I need a service
                    </option>
                    <option value='Partnership' className='text-gray-900'>
                      Partnership opportunity
                    </option>
                    <option value='Career' className='text-gray-900'>
                      Career inquiry
                    </option>
                    <option value='Other' className='text-gray-900'>
                      Other reason
                    </option>
                  </select>
                </div>

                {/* Services selection (only when Service is selected) */}
                {reason === 'Service' && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Which services are you interested in?
                    </label>
                    <div className='space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-200 rounded-md'>
                      {availableServices.map((service) => (
                        <div key={service} className='flex items-center'>
                          <input
                            type='checkbox'
                            id={`service-${service}`}
                            autoComplete='on'
                            checked={services.includes(service)}
                            onChange={() => handleServiceToggle(service)}
                            className='h-4 w-4 text-violet-600 focus:ring-violet-600 border-gray-300 rounded'
                          />
                          <label
                            htmlFor={`service-${service}`}
                            className='ml-2 block text-sm text-gray-700'
                          >
                            {service}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company Name field (only for Service and Partnership) */}
                {(reason === 'Service' || reason === 'Partnership') && (
                  <div>
                    <label
                      htmlFor='companyName'
                      className='block text-sm font-medium text-gray-700 mb-1'
                    >
                      Company Name
                    </label>
                    <input
                      type='text'
                      id='companyName'
                      value={companyName}
                      autoComplete='on'
                      onChange={(e) => setCompanyName(e.target.value)}
                      className='w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-300'
                      required={
                        reason === 'Service' || reason === 'Partnership'
                      }
                      placeholder='Enter your company name'
                    />
                  </div>
                )}

                {/* Other reason text box (conditional) */}
                {reason === 'Other' && (
                  <div>
                    <label
                      htmlFor='otherReason'
                      className='block text-sm font-medium text-gray-700 mb-1'
                    >
                      Please specify your reason
                    </label>
                    <textarea
                      id='otherReason'
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      rows='3'
                      className='w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-300'
                      required={reason === 'Other'}
                    ></textarea>
                  </div>
                )}

                {/* Message field */}
                <div>
                  <label
                    htmlFor='message'
                    className='block text-sm font-medium text-gray-700 mb-1'
                  >
                    Your Message
                  </label>
                  <textarea
                    id='message'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows='4'
                    className='w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-colors duration-300'
                    placeholder='Tell us about your project, requirements, or any questions you have...'
                  ></textarea>
                </div>

                {/* Submit button */}
                <div>
                  <StyledButton
                    type='submit'
                    variant='primary'
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className={`w-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-600 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <span className='flex items-center justify-center'>
                        <svg
                          className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                          ></circle>
                          <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          ></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </StyledButton>
                </div>

                {submitStatus === 'error' && (
                  <div className='mt-4 p-3 bg-red-50 text-red-700 rounded-md'>
                    <p>
                      There was an error sending your message. Please try again
                      later.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
