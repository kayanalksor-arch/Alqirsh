import Link from 'next/link';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { PropertiesListingView } from '@/components/properties-listing-view';
import { getPublicProperties } from '@/lib/public-catalogue';
import type { Metadata } from 'next';
import { localizedMetadata } from '@/lib/metadata';
import { cookies } from 'next/headers';
import { indexableListingStatuses } from '@/lib/listings';
export async function generateMetadata(): Promise<Metadata> {
  const [offers, cookieStore] = await Promise.all([getPublicProperties('all'), cookies()]);
  const count = offers.filter((offer) => indexableListingStatuses.includes(offer.status as (typeof indexableListingStatuses)[number])).length;
  const locale = cookieStore.get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const title = count
    ? (locale === 'en' ? `Property Listings for Sale and Rent in Egypt (${count})` : `عقارات للبيع والإيجار في مصر (${count} إعلانًا)`)
    : (locale === 'en' ? 'Explore Properties' : 'استكشف العقارات');
  const description = count
    ? (locale === 'en' ? `Browse ${count} currently available property listings for sale and rent in Egypt. Filter by area and property type.` : `تصفح ${count} من العقارات المتاحة حاليًا للبيع والإيجار في مصر، وابحث حسب المنطقة ونوع العقار.`)
    : (locale === 'en' ? 'Browse property categories on Alqirsh and contact us to ask about available options.' : 'تعرّف على أقسام العقارات في منصة القرش وتواصل معنا للاستفسار عن الخيارات المتاحة.');
  return localizedMetadata({ title, description, alternates: { canonical: '/properties' }, ...(!count ? { robots: { index: false, follow: true } } : {}) });
}


export default async function PropertiesPage() {
  const offers = await getPublicProperties('all');
  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="page-container">
        {/* Header */}
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="eyebrow">القِرش | العقارات</p>
          <h1 className="mt-2 text-3xl font-black">العقارات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">تصفح العقارات المعروضة للبيع والإيجار مع فلاتر وبحث متقدم.</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-[var(--line)]">
          <Link
            href="/properties"
            className="px-4 py-3 font-bold border-b-2 border-[var(--brand)] text-[var(--brand)]"
          >
            الكل
          </Link>
          <Link
            href="/properties/sale"
            className="px-4 py-3 font-bold text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            للبيع
          </Link>
          <Link
            href="/properties/rent"
            className="px-4 py-3 font-bold text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            للإيجار
          </Link>
        </div>

        {/* Listing View */}
        <PropertiesListingView view="all" offers={offers} />
      </section><PublicFooter />
    </main>
  );
}
