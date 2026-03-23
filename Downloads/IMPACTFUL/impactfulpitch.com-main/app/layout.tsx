import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/src/components/Navbar';
import Footer from '@/src/components/Footer';
import ScrollToTop from '@/src/components/ScrollToTop';
import SplashCursor from '@/src/components/SplashCursor';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { ConvexClientProvider } from '@/lib/convex';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  // Use the 'template' property for the title
  title: {
    default: 'Impactful Pitch: Helping Startups in their Fundraising Journey!', // For the homepage
    template: '%s | Impactful Pitch', // %s will be replaced by the page's title
  },
  description:
    'Impactful Pitch provides guidance & resources like pitch decks, financials & business valuation to ace your fundraising!',
  keywords:
    'impactful pitch, pitch deck, entrepreneur, startup, fundraising, startup funding, startup, vc, venture capital, india, funding, entrepreneurship, business, investment banking, pitch coaching, startup success',
  authors: [{ name: 'Impactful Pitch' }],
  icons: {
    icon: '/assets/ImpactfulPitchIcon.webp',
  },
  openGraph: {
    title: 'Impactful Pitch',
    description:
      'Get Investment Ready with Impactful Pitch. Your End to End Fundraising Partner',
    type: 'website',
    images: [
      {
        url: 'https://www.impactfulpitch.com/assets/ImpactfulPitchIcon.webp',
        width: 1200,
        height: 630,
        alt: 'Impactful Pitch Icon',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        {/*
          1. Google Tag Manager (Head Script)
          - strategy="afterInteractive": Loads the script after the page is interactive, so it doesn't block rendering.
        */}
        <Script id='google-tag-manager' strategy='afterInteractive'>
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-M9TXXV5');
          `}
        </Script>

        {/* 2. Google Analytics (gtag.js) - The external library file */}
        {/* We give it a 'src' and its own ID. */}
        <Script
          id='google-analytics-library'
          strategy='afterInteractive'
          src='https://www.googletagmanager.com/gtag/js?id=G-ZFH52L06M1'
        />

        {/* 3. Google Analytics (gtag.js) - The inline configuration script */}
        {/* This script depends on the one above. It gets its own ID. */}
        <Script id='google-analytics-config' strategy='afterInteractive'>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZFH52L06M1');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {/*
          2. Google Tag Manager (Body NoScript Fallback)
          - This is for users with JavaScript disabled. It's not a script, so it goes directly in the body.
        */}
        <noscript>
          <iframe
            src='https://www.googletagmanager.com/ns.html?id=GTM-M9TXXV5'
            height='0'
            width='0'
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        <ConvexClientProvider>
          <SplashCursor />
          <ScrollToTop />
          <div className='min-h-screen flex flex-col'>
            <Navbar />
            <main className='flex-1 bg-white'>{children}</main>
            <Footer />
          </div>
          <SpeedInsights />
          <Analytics />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
