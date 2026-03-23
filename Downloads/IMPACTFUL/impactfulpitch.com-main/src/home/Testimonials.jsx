'use client';

import { TestimonialsColumn } from '@/src/home/components/TestimonialColumn';
import { motion } from 'framer-motion';

const Testimonialicon = '/assets/Testimonialicon.svg';

// Helper function to get image URL for local testimonials
const getTestimonialImageUrl = (name) => {
  const fileName = name.replace(/\s/g, '') + '.webp'; // Remove spaces and add .webp
  return `/assets/testimonials/${fileName}`;
};

const testimonials = [
  {
    quote:
      'We have had an excellent experience working on our pitchdeck, with Nikhil & his whole team. They were prompt, responsive and very professional, which helped us to put together the first draft of our pitch deck in a record time of 11 days. I am sure we will have a rewarding association with them, going forward upto the investment.',
    name: 'Gauri Kumar',
    position: 'Founder of Scholar Planet',
    image: getTestimonialImageUrl('Gauri Kumar'),
    // companyLogo: ScholarPlanet
  },
  {
    quote:
      'We worked with Mr. Nikhil and his great team to design and make our pitch deck. It was a great thorough experience, they bring a lot of experience and professionalism. The design they have created is very neat and smart and I have really liked it. Would recommend it to anyone who is looking to get their pitch deck made but is new to the fundraising world.',
    name: 'Vedansh Goyal',
    position: 'Founder of 1.5 Degree',
    image: getTestimonialImageUrl('Vedansh Goyal'),
    // companyLogo: Degree1
  },
  {
    quote:
      'Working with this team has been game-changing for our startup. Their pitch deck design and strategic guidance helped us secure investment from our top-choice VCs.',
    name: 'Mayank Jani',
    position: 'Founder of Nanta Tech',
    image: getTestimonialImageUrl('Mayank Jani'),
    // companyLogo: NantaTech
  },
  {
    quote:
      'I was having a hard time telling the entire story, Nikhil & Binita helped me get conceptualize and give more context, the same is visible through a pitch deck. They were very helpful and cooperative during this process and ultimately this will lead to more investor meetings! Cheers!!',
    name: 'Digvijay Pandey',
    position: 'Founder of Cartz Fresh',
    image: getTestimonialImageUrl('Digvijay Pandey'),
    // companyLogo: CartzFresh
  },
  {
    quote:
      'Got my pitch deck & financial model made by Impactful Pitch. The team has excellent patience and it lived up to the expectations. Also, the team has immense knowledge regarding the fundraising process in the ecosystem. Highly recommendable and we will work again for our future projects.',
    name: 'Sanjay Singha',
    position: 'Founder of Getout',
    image: getTestimonialImageUrl('Sanjay Singha'),
    // companyLogo: Getout
  },
  {
    quote:
      "AlgoBulls' pitch was nothing sort of masterful. It was a testament to Nikhil & his team's ability to translate abstract ideas into tangible, compelling visuals. The combination of vivid imagery and detailed PDFs brought to life the founders' vision in a way that resonated deeply. Their presentation crafting was inspiring, leaving a lasting impression on everyone who witnessed it.  This level of creative execution is a clear indication of their talent and dedication and it bodes well for the future success of Nikhil & his team.",
    name: 'Suraj Bathija',
    position: 'Co-Founder of AlgoBulls',
    image: getTestimonialImageUrl('Suraj Bathija'),
    // companyLogo: AlgoBulls
  },
  {
    quote:
      "I recently engaged with Impactful Pitch to prepare my investment deck, and I must say, I am thoroughly impressed with the quality of their service. From start to finish, Nikhil & his team exhibited professionalism, expertise, and a keen understanding of what investors look for. Firstly, the communication throughout the process was impeccable. They took the time to understand my business, its unique value proposition, and the target audience for the investment deck. This attention to detail ensured that the final product truly reflected the essence of my company and its potential for investors. Moreover, the design and layout of the investment deck were top-notch. The visuals were engaging, concise, and effectively conveyed key information about the business model, market opportunity, financial projections, and competitive landscape. The deck was not only aesthetically pleasing but also highly informative, making it easy for investors to grasp the value with minimal effort. Overall, my experience with Impactful Pitch exceeded my expectations. Their commitment to excellence, attention to detail, and dedication to client satisfaction set them apart in the industry. I would highly recommend them to any entrepreneur looking to create a compelling investment deck that stands out in the competitive landscape.",
    name: 'Shashank Rai',
    position: 'Founder of Fledge Health',
    image: getTestimonialImageUrl('Shashank Rai'),
    // companyLogo: FledgeHealth
  },
  {
    quote:
      "Impactful Pitch has been the real game changer in the Startup Pitch Presentation of GWellth Foods & UpScaling our startup with their expert knowledge on the subject. We are truly moved by the young & energetic team's proactive implementation & financial presentation knowledge & wish to continue this journey to unravel the true potential of Startup Pitch Presentation of Impactful Pitch Services.",
    name: 'Preetam Lingwal',
    position: 'Founder of Gwellth',
    image: getTestimonialImageUrl('Preetam Lingwal'),
    // companyLogo: Gwellth
  },
  {
    quote:
      "I had a great experience working with Impactful Pitch to create my investment deck. Nikhil and his team were professional, attentive and truly understood what investors look for. They took the time to learn about my business and crafted a deck that was both visually impressive and easy to understand. The design was clean, the content was sharp and the entire process was smooth. I'd highly recommend them to any founder looking to build a standout pitch deck.",
    name: 'Avinish Jain',
    position: 'Founder of Evora Greens',
    image: getTestimonialImageUrl('Avinish Jain'),
    // companyLogo: EvoraGreens
  },
  {
    quote:
      "It was a delight to work with the Impactful Pitch team. We had lengthy discussions around our company's business model which helped in getting a better understanding of the approach that should be taken in order to pitch the company the right way to the investors. They structured the deck in a way that made it easy to comprehend and brought out the key points. The discussions during preparing financial projections made us think hard about our business and helped in getting clarity about a lot of things that had missed our attention earlier. Binita and Sagar are great to work with and made the entire experience smooth and insightful for us.",
    name: 'Ankit Ojha',
    position: 'Founder',
    image: getTestimonialImageUrl('Ankit Ojha'),
  },
  {
    quote:
      "Amazing & Supportive Team and very detailed oriented. They kept us updated at every step and delivered before deadline. The Deck has opened the door for us we did not think were possible. Big thank you to entire Team of Impactful Pitch and Nikhil Ji.",
    name: 'DK RBD',
    position: 'Local Guide',
    image: getTestimonialImageUrl('DK RBD'),
  },
  {
    quote:
      "Impactful pitch has honestly changed the way we approach fundraising, their team did not just make a deck - They understood our story & vision and than helped us. Thanks Impactful Team.",
    name: 'RBD Machine Tools Pvt Ltd',
    position: 'Leadership Team',
    image: getTestimonialImageUrl('RBD Machine Tools Pvt Ltd'),
  },
  {
    quote:
      "Most of Start ups founders needs huge funds for their dreams come true.....Impactful Pitch- Pitchverse Global Network pvt limited....offers clients for providing fruitful , result oriented efforts for required amount of funds...at different comfortably , acceptable",
    name: 'Rajnikant Parmar',
    position: 'Founder',
    image: getTestimonialImageUrl('Rajnikant Parmar'),
  },
  {
    quote:
      "The team at Impactful Pitch is an exceptional resource for entrepreneurs who are facing challenges in securing funding and establishing connections within their respective fields. Their knowledgeable staff provides individualized coaching and guidance, enabling their clients to effectively pitch their business and secure necessary investments. I would enthusiastically recommend Impactful Pitch to any entrepreneur seeking to enhance their business operations.",
    name: 'Dhruv Prajapati',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Dhruv Prajapati'),
  },
  {
    quote:
      "Impactful Pitch is a fantastic organization that truly cares about helping entrepreneurs succeed. They provide valuable support and guidance, and they are committed to helping their clients achieve their goals. I would highly recommend them to anyone who is looking to grow their business and take their entrepreneurial journey to the next level.",
    name: 'Smit Patel',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Smit Patel'),
  },
  {
    quote:
      "Impactful Pitch is a truly exceptional organization that provides invaluable resources and support to entrepreneurs seeking to grow their business. Their commitment to their clients' success is unwavering, and their dedication to providing personalized guidance and support is truly inspiring. I would highly encourage any entrepreneur seeking to enhance their business operations to utilize the expertise and resources provided by Impactful Pitch.",
    name: 'Heni Gandhi',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Heni Gandhi'),
  },
  {
    quote:
      "We worked with Mr. Nikhil and his team for our pitch deck. Starting with crafting a compelling storyline for the pitch deck to creating an extravagant design for the pitch deck, they were on their toes to provide the best quality. Mr. Nikhil and Mr. Siddhartha was very helpful and gave us proper guidance on how to pitch to investors.",
    name: 'Shobhana Dave',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Shobhana Dave'),
  },
  {
    quote:
      "Impactful Pitch is an outstanding company that truly understands the global market and can help businesses secure the funds they need to succeed. I'm thrilled to share that they were able to assist us with all of our financing needs by better understanding our unique requirements, and we are very satisfied with their services. One of the things that sets Impactful Pitch apart is their ability to accommodate any business requirements you may have. They recognize that every business is unique and that different companies have different needs at different times. With their expertise and experience, they can help you navigate the complexities of the global market and find the funding solutions that work best for your organization. Overall, I highly recommend Impactful Pitch to any business owner looking for financing solutions. They are knowledgeable, experienced, and truly understand the global market. I'm grateful to share that they were able to help our guac store in Brantford, Ontario, and I'm confident they will be able to help many others in the future to succeed.",
    name: 'Hardy Patel',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Hardy Patel'),
  },
  {
    quote:
      "The team of the Impactful Pitch take the time to understand your unique needs and goals, and they provide you with personalized support and resources that are tailored to your business. And they are with you every step of the way, providing guidance and advice as you navigate the challenges of growing your business.",
    name: 'Yash Shah',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Yash Shah'),
  },
  {
    quote:
      "We worked with Mr Nikhil and his great team to design and make our pitch deck. It was a great thorough experience, they bring a lot of experience and professionalism. The design they have created is very neat and smart and I have really liked it. Would recommend it to anyone who is looking to get their pitch deck made but is new to the fundraising world.",
    name: 'Vedansh Goyal',
    position: 'Founder of 1.5 Degree',
    image: getTestimonialImageUrl('Vedansh Goyal'),
    // companyLogo: Degree1
  },
  {
    quote:
      "If you're looking for a partner who can help you take your business to the next level, then I would highly recommend working with Impactful Pitch. Their team of experts provides invaluable resources and support, and their commitment to their clients' success is unparalleled.",
    name: 'AMAY SONI',
    position: 'Entrepreneur',
    image: getTestimonialImageUrl('AMAY SONI'),
  },
  {
    quote:
      "It was great to have a strong team like Impactful Pitch to create the extensive and meaningful documentation within constrained timeline with expert views by founder Mr. Nikhil Parmar, which helps a lot while detailed discussions with potential investors.",
    name: 'Abhinov Sinha',
    position: 'Local Guide',
    image: getTestimonialImageUrl('Abhinov Sinha'),
  },
  {
    quote:
      "Impressed by the attention to detail and creativity in our pitch deck. The team truly understood our vision and translated it into a visually stunning presentation that captivated investors.",
    name: 'Akshay Bhatnagar',
    position: 'local Guide',
    image: getTestimonialImageUrl('Akshay Bhatnagar'),
  },
];

const firstColumn = testimonials.slice(0, 6);
const secondColumn = testimonials.slice(6, 13);
const thirdColumn = testimonials.slice(13, 23);

const Testimonials = () => {
  return (
    <section className='py-8 relative bg-white'>
      <div className='container z-10 mx-auto'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className='flex flex-col items-center justify-center max-w-[540px] mx-auto'
        >
          <div className='inline-flex items-center justify-center px-3 sm:px-4 py-1 mb-2 sm:mb-4 rounded-full bg-gray-800 backdrop-blur-sm text-white text-xs sm:text-sm transform transition-transform duration-500 hover:scale-105'>
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg> */}
            <img
              src={Testimonialicon}
              alt='Testimonial Icon'
              className='h-4 w-4 mr-2 scale-115'
              fill='#1e2939'
            />
            <span className='font-medium text-blue-300'>Testimonials</span>
          </div>

          {/* <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5">
            What our Founders say
          </h2>
          <p className="text-center mt-5 opacity-75">
            See what our customers have to say about us.
          </p> */}
        </motion.div>

        <div className='flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden'>
          <TestimonialsColumn testimonials={firstColumn} duration={12} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className='hidden md:block'
            duration={11}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className='hidden lg:block'
            duration={13}
          />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
