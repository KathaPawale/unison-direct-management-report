import RefundPolicy from '@/src/about/RefundPolicy';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'Refund Policy for Impactful Pitch. Learn about our refund eligibility, process, and commitment to our clients.',
  keywords:
    'refund policy, refund eligibility, payment policy, impactful pitch',
  alternates: {
    canonical: 'https://www.impactfulpitch.com/refund-policy',
  },
};

export default function RefundPolicyPage() {
  return <RefundPolicy />;
}
