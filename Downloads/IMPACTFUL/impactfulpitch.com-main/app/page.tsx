import Home from '@/src/home/Home';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: 'https://www.impactfulpitch.com/',
  },
};

export default function HomePage() {
  return <Home />;
}
