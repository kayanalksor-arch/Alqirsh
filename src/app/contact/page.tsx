import { ContactCard } from '@/components/contact-card';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'تواصل معنا', description: 'تواصل مع فريق القِرش للاستفسار عن عروض العقارات والسيارات وخدمات المنصة.', alternates: { canonical: '/contact' } };

export default function ContactPage() { return <main className="app-shell min-h-screen"><PublicHeader /><section className="page-container"><ContactCard /></section><PublicFooter /></main>; }
