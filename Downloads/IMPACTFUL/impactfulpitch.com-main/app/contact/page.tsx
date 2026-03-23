import Contact from '@/src/contact/Contact';

import type { Metadata } from 'next';

// This metadata object is ONLY for the /contact page
export const metadata: Metadata = {
  title: 'Contact Us', // A more specific title for this page will render as "Contact Us | Impactful Pitch" using the template in layout.tsx
  description:
    'Get in touch with the Impactful Pitch team for startup storytelling, investor decks, and strategic fundraising support. Let’s bring your vision to life.',
  keywords:
    'contact, impactful pitch, pitch deck, get in touch, fundraising, startup, support, startup fundraising',
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: `https://www.impactfulpitch.com/contact`,
  },
};

export default function ContactPage() {
  return <Contact />;
}
