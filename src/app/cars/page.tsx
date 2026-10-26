import Link from 'next/link';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { CarsListingView } from '@/components/cars-listing-view';
import { getPublicCars } from '@/lib/public-catalogue';
import type { Metadata } from 'next';
import { localizedMetadata } from '@/lib/metadata';
import { cookies } from 'next/headers';
import { indexableListingStatuses } from '@/lib/listings';
export async function generateMetadata(): Promise<Metadata> {
  const [listings, cookieStore] = await Promise.all([getPublicCars('all'), cookies()]);
  const count = listings.filter((listing) => indexableListingStatuses.includes(listing.status as (typeof indexableListingStatuses)[number])).length;
  const locale = cookieStore.get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const metadata = count
    ? locale === 'en'
      ? { title: `Cars for Sale and Rent in Egypt (${count} listings)`, description: `Browse ${count} currently listed cars in Egypt and review each vehicle's recorded make, model, condition, location, and price.` }
      : { title: `سيارات للبيع والإيجار في مصر (${count} عروض)`, description: `تصفح ${count} من السيارات المنشورة في مصر، وراجع الماركة والموديل والحالة والموقع والسعر المسجل لكل سيارة.` }
    : locale === 'en'
      ? { title: 'Explore Cars', description: 'There are no cars currently listed. Contact Alqirsh if you would like help with a vehicle enquiry.' }
      : { title: 'استكشف السيارات', description: 'لا توجد سيارات معروضة حاليًا. تواصل مع القرش إذا كنت ترغب في الاستفسار عن سيارة.' };
  return localizedMetadata({ ...metadata, alternates: { canonical: '/cars' }, ...(!count ? { robots: { index: false, follow: true } } : {}) });
}


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
