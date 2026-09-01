import Link from 'next/link';
import { PublicHeader } from '@/components/public-header';
import { CarsListingView } from '@/components/cars-listing-view';

export default function CarsForRentPage() {
  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="page-container">
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="eyebrow">القِرش | السيارات</p>
          <h1 className="mt-2 text-3xl font-black">سيارات للإيجار</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">تصفح السيارات المتاحة للإيجار.</p>
        </div>
        <div className="mt-6 flex gap-2 border-b border-[var(--line)]">
          <Link href="/cars" className="px-4 py-3 font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">الكل</Link>
          <Link href="/cars/sale" className="px-4 py-3 font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">للبيع</Link>
          <Link href="/cars/rent" className="border-b-2 border-[var(--brand)] px-4 py-3 font-bold text-[var(--brand)]">للإيجار</Link>
        </div>
        <CarsListingView view="rent" />
      </section>
    </main>
  );
}
