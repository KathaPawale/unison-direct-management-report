import SuccessStories from '@/src/success-stories/SuccessStories';

import type { Metadata } from 'next';

// This metadata object is ONLY for the /success-stories page
export const metadata: Metadata = {
  title: 'Success Stories', // A more specific title for this page will render as "Success Stories | Impactful Pitch" using the template in layout.tsx
  description:
    'Read real fundraising journeys of startups we’ve worked with—from Seed to Series A. Discover how impactful storytelling drove investor success.',
  keywords:
    'success stories, impactful pitch, venture capital funding, Impactful Pitch clients, pitch deck, fundraising, startup, startup fundraising',
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: 'https://www.impactfulpitch.com/success-stories',
  },
};

export default function SuccessStoriesPage() {
  return <SuccessStories />;
}
