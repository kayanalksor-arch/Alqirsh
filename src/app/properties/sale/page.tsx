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
  const [offers, cookieStore] = await Promise.all([getPublicProperties('sale'), cookies()]);
  const count = offers.filter((offer) => indexableListingStatuses.includes(offer.status as (typeof indexableListingStatuses)[number])).length;
  const locale = cookieStore.get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const metadata = count
    ? locale === 'en'
      ? { title: `Properties for Sale in Egypt (${count} listings)`, description: `Browse ${count} currently listed properties for sale in Egypt, with recorded location, area, property type, and price details.` }
      : { title: `عقارات للبيع في مصر (${count} إعلانًا)`, description: `تصفح ${count} من العقارات المنشورة للبيع في مصر، مع معلومات مسجلة عن الموقع والمساحة ونوع العقار والسعر.` }
    : locale === 'en'
      ? { title: 'Explore Properties for Sale', description: 'No properties are currently listed for sale. Contact Alqirsh to ask about available options.' }
      : { title: 'استكشف عقارات للبيع', description: 'لا توجد عقارات معروضة للبيع حاليًا. تواصل مع القرش للاستفسار عن الخيارات المتاحة.' };
  return localizedMetadata({ ...metadata, alternates: { canonical: '/properties/sale' }, ...(!count ? { robots: { index: false, follow: true } } : {}) });
}


export default async function SalePropertiesPage() {
  const offers = await getPublicProperties('sale');
  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="page-container">
        {/* Header */}
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="eyebrow">القِرش | العقارات</p>
          <h1 className="mt-2 text-3xl font-black">عروض البيع</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">اكتشف أفضل العقارات المعروضة للبيع في مختلف المناطق.</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-[var(--line)]">
          <Link
            href="/properties"
            className="px-4 py-3 font-bold text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            الكل
          </Link>
          <Link
            href="/properties/sale"
            className="px-4 py-3 font-bold border-b-2 border-[var(--brand)] text-[var(--brand)]"
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
        <PropertiesListingView view="sale" offers={offers} />
      </section><PublicFooter />
    </main>
  );
}
