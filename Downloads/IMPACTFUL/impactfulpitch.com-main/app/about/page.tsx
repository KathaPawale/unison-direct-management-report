import About from '@/src/about/About';

import type { Metadata } from 'next';

// This metadata object is ONLY for the /about page
export const metadata: Metadata = {
  title: 'About Us', // A more specific title for this page will render as "About Us | Impactful Pitch" using the template in layout.tsx
  description:
    'We are startup consulting experts helping founders in their fundraising journey! Learn about our mission to empower startups.',
  keywords:
    'about, journey, ethics, vision, mission, frequently asked questions, impactful pitch, pitch deck, fundraising, startup, startup fundraising',
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: 'https://www.impactfulpitch.com/about',
  },
};

export default function AboutPage() {
  return <About />;
}
