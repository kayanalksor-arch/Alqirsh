import Link from 'next/link';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { CarsListingView } from '@/components/cars-listing-view';
import { getPublicCars } from '@/lib/public-catalogue';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'سيارات للبيع والإيجار في مصر', description: 'تصفح عروض السيارات للبيع والإيجار في مصر على منصة القِرش، وقارن التفاصيل والأسعار واختر السيارة المناسبة.' , alternates: { canonical: '/cars' } };

export default async function CarsPage() {
  const vehicles = await getPublicCars('all');
  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="page-container">
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="eyebrow">القِرش | السيارات</p>
          <h1 className="mt-2 text-3xl font-black">السيارات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">تصفح السيارات المعروضة للبيع والإيجار مع بحث وفلترة سهلة.</p>
        </div>
        <div className="mt-6 flex gap-2 border-b border-[var(--line)]">
          <Link href="/cars" className="border-b-2 border-[var(--brand)] px-4 py-3 font-bold text-[var(--brand)]">الكل</Link>
          <Link href="/cars/sale" className="px-4 py-3 font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">للبيع</Link>
          <Link href="/cars/rent" className="px-4 py-3 font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">للإيجار</Link>
        </div>
        <CarsListingView view="all" vehicles={vehicles} />
      </section><PublicFooter />
    </main>
  );
}
