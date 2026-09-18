import { ContactCard } from '@/components/contact-card';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';

export default function ContactPage() { return <main className="app-shell min-h-screen"><PublicHeader /><section className="page-container"><ContactCard /></section><PublicFooter /></main>; }
