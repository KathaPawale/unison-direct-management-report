import ManBehind from '@/src/home/ManBehind';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nikhil Parmar - Founder & CEO',
  description:
    'Meet Nikhil Parmar, IIM Alumni, Angel Investor, TEDx speaker and global impact strategist. 7000+ startups guided in fundraising with expertise in startup strategy and investments.',
  keywords:
    'Nikhil Parmar, startup mentor, angel investor, TEDx speaker, IIM alumni, fundraising expert, startup strategy',
  alternates: {
    // This sets the <link rel="canonical" ... /> tag
    canonical: 'https://www.impactfulpitch.com/nikhil-parmar',
  },
  openGraph: {
    title: 'Nikhil Parmar - Expert Startup Mentor & Angel Investor',
    description:
      'TEDx speaker, serial entrepreneur and startup mentor who has guided 7000+ startups in fundraising.',
    type: 'profile',
    images: [
      {
        url: 'https://www.impactfulpitch.com/assets/NikhilParmar.webp',
        width: 1200,
        height: 630,
        alt: 'Nikhil Parmar, Founder & CEO of Impactful Pitch',
      },
    ],
  },
};

export default function NikhilProfilePage() {
  return (
    <div className='relative w-full min-h-screen'>
      <div className='relative z-10 pt-28 backdrop-blur-[1px]'>
        <ManBehind
          chipText="Founder's Profile"
          normalHeading='Your'
          highlightedHeading='Strategic Growth Architect'
          description='Helping founders pitch better, raise faster, grow smarter'
        />
      </div>
    </div>
  );
}
