import Portfolio from '@/src/portfolio/Portfolio';

import type { Metadata } from 'next';

// This metadata object is ONLY for the /portfolio page
export const metadata: Metadata = {
  title: 'Our Portfolio', // A more specific title for this page will render as "Our Portfolio | Impactful Pitch" using the template in layout.tsx
  description:
    'Discover high-potential startups we’ve worked with. From pitch decks to funding strategy, these companies trusted us to tell their fundraising story.',
  keywords:
    'portfolio, impactful pitch, startup, unicorns, fintech, healthtech, d2c, e-commerce, saas, ev, agritech, spacetech, fashion, pitch deck, fundraising, startup fundraising, ',
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: 'https://www.impactfulpitch.com/portfolio',
  },
};

export default function PortfolioPage() {
  return <Portfolio />;
}
