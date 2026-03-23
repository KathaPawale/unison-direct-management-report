import Services from '@/src/services/Services';

import type { Metadata } from 'next';

// This metadata object is ONLY for the /services page
export const metadata: Metadata = {
  title: 'Our Services', // A more specific title for this page will render as "Our Services | Impactful Pitch" using the template in layout.tsx
  description:
    'Our services are tailored to help founders and startups create winning pitch decks and achieve success in fundraising!',
  keywords:
    'services, pitch deck review, pitch deck creation, business plan development, financial modelling, business valuation, founder grooming, investor network, video pitch, impactful pitch, fundraising, startup, startup fundraising',
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: 'https://www.impactfulpitch.com/services',
  },
};

export default function ServicesPage() {
  return <Services />;
}
