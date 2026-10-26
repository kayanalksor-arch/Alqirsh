import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Building2, CarFront, MessageCircle } from 'lucide-react';
import { ContactCard } from '@/components/contact-card';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { SocialLinks } from '@/components/social-links';
import { localizedMetadata } from '@/lib/metadata';
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({
  title: 'تواصل معنا',
  description: 'تواصل مع فريق القِرش واستكشف حساباتنا الرسمية على فيسبوك وإنستجرام وتيك توك.',
  alternates: { canonical: '/contact' },
  openGraph: { type: 'website', title: 'تواصل معنا | القِرش', description: 'وسائل التواصل الرسمية مع منصة القِرش.' },
});
}


export default function ContactPage() {
  return <main className="app-shell min-h-screen"><PublicHeader />
    <section className="page-container page-container--narrow">
      <header className="panel overflow-hidden rounded-3xl p-6 sm:p-9">
        <p className="eyebrow">القِرش | نحن هنا للمساعدة</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">تواصل معنا</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-[var(--muted)] sm:text-base">يسعد فريق القِرش استقبال استفساراتك عن العروض والخدمات المتاحة. تواصل معنا هاتفيًا أو تابع حساباتنا الرسمية.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/properties" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-white"><Building2 size={17}/>استكشف العقارات</Link>
          <Link href="/cars" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold"><CarFront size={17}/>استكشف السيارات</Link>
          <Link href="/report-issue" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold"><MessageCircle size={17}/>الإبلاغ عن مشكلة <ArrowLeft size={15}/></Link>
        </div>
      </header>

      <section aria-labelledby="social-heading" className="mt-8">
        <div className="mb-4"><p className="eyebrow">مجتمع القِرش</p><h2 id="social-heading" className="mt-1 text-2xl font-black">تابع القِرش على منصات التواصل الاجتماعي</h2><p className="mt-2 text-sm leading-7 text-[var(--muted)]">تابع حساباتنا الرسمية لمعرفة جديد القِرش.</p></div>
        <SocialLinks />
      </section>

      <section aria-labelledby="phone-section-heading" className="mt-8">
        <h2 id="phone-section-heading" className="sr-only">التواصل الهاتفي</h2>
        <ContactCard />
      </section>
    </section><PublicFooter /></main>;
}
