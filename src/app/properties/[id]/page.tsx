import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Phone } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { ImageLightbox } from '@/components/image-lightbox';
import { JsonLd } from '@/components/json-ld';
import { getPublicPropertyPageData } from '@/lib/public-catalogue';
import { formatEgpLocalized, indexableListingStatuses, listingStatusClass, listingStatusLabel, formatNumber } from '@/lib/listings';
import { cookies } from 'next/headers';
import { translate, translateEnum } from '@/lib/i18n';
import { LocalizedUserContent } from '@/components/localized-user-content';

type PropertyDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string | string[] }>;
};

const listingTypeFrom = (type: string | string[] | undefined): 'sale' | 'rental' => type === 'rental' ? 'rental' : 'sale';

export async function generateMetadata({ params, searchParams }: PropertyDetailsPageProps): Promise<Metadata> {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const listingType = listingTypeFrom(search.type);
  const data = await getPublicPropertyPageData(id, listingType);
  if (!data) return { title: 'العقار غير موجود | القرش', robots: { index: false, follow: false } };
  const { property } = data;
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const typeLabel = listingType === 'rental' ? (locale === 'en' ? 'for rent' : 'للإيجار') : (locale === 'en' ? 'for sale' : 'للبيع');
  const kind = property.property_type ? translateEnum(property.property_type, locale) : (locale === 'en' ? 'Property' : 'عقار');
  const titleHasListingType = /\bfor (sale|rent)\b|للبيع|للإيجار/iu.test(property.title);
  const seoTitle = titleHasListingType ? property.title : `${property.title} ${typeLabel}`;
  const title = locale === 'en'
    ? `${seoTitle}${property.location ? ` in ${property.location}` : ''}`
    : `${seoTitle}${property.location ? ` في ${property.location}` : ''}`;
  const normalizedTitle = title.replace(/\s{2,}/gu, ' ').trim();
  const arabicDescription = Boolean(property.description && /[\u0600-\u06ff]/u.test(property.description));
  const facts = locale === 'en'
    ? [property.area ? `Area: ${property.area} m²` : null, property.bedrooms ? `Bedrooms: ${property.bedrooms}` : null, property.location ? `Location: ${property.location}` : null]
    : [property.area ? `المساحة ${property.area} م²` : null, property.bedrooms ? `${property.bedrooms} غرف` : null, property.location].filter(Boolean);
  const description = locale === 'en'
    ? [property.description && !arabicDescription ? property.description.trim() : null, `${kind} ${typeLabel}.`, ...facts, arabicDescription ? 'The original description is in Arabic.' : null].filter(Boolean).join(' ').slice(0, 160)
    : [property.description?.trim(), ...facts].filter(Boolean).join('، ').slice(0, 160)
      || `تفاصيل ${kind} ${typeLabel} على منصة القرش.`;
  const canonical = `/properties/${property.id}${listingType === 'rental' ? '?type=rental' : ''}`;
  const indexable = indexableListingStatuses.includes(property.status as (typeof indexableListingStatuses)[number]);
  return {
    title: normalizedTitle,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: true },
    openGraph: { type: 'website', title: `${normalizedTitle} | Alqirsh`, description, url: canonical, ...(data.images[0] ? { images: [{ url: data.images[0], alt: property.title }] } : {}) },
    twitter: { card: 'summary_large_image', title: `${normalizedTitle} | Alqirsh`, description, ...(data.images[0] ? { images: [data.images[0]] } : {}) },
  };
}

export default async function PropertyDetailsPage({ params, searchParams }: PropertyDetailsPageProps) {
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const t = (text: string) => translate(text, locale);
  const { id } = await params;
  const { type } = await searchParams;
  const propertyType = listingTypeFrom(type);
  const data = await getPublicPropertyPageData(id, propertyType);
  if (!data) notFound();
  const { property, images } = data;
  const category = propertyType === 'rental'
    ? (locale === 'en' ? 'Properties for Rent' : 'عقارات للإيجار')
    : (locale === 'en' ? 'Properties for Sale' : 'عقارات للبيع');
  const propertyUrl = `https://alqirsh.online/properties/${property.id}${propertyType === 'rental' ? '?type=rental' : ''}`;
  const businessFunction = propertyType === 'rental' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell';
  const availability = property.status === 'available' ? 'https://schema.org/InStock' : property.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/OutOfStock';
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebPage',
      name: property.title, url: propertyUrl, inLanguage: locale === 'en' ? 'en-EG' : 'ar-EG',
      ...(property.description ? { description: property.description } : {}),
      ...(images[0] ? { primaryImageOfPage: images[0] } : {}),
      ...(property.price != null ? {
        mainEntity: {
          '@type': 'Offer', name: property.title, url: propertyUrl, businessFunction, availability,
          ...(property.description ? { description: property.description } : {}),
          itemOffered: {
            '@type': 'Place', name: property.title,
            ...(property.location || property.address ? { address: { '@type': 'PostalAddress', ...(property.location ? { addressLocality: property.location } : {}), ...(property.address ? { streetAddress: property.address } : {}), addressCountry: 'EG' } } : {}),
            ...(images[0] ? { image: images[0] } : {}),
          },
          ...(propertyType === 'rental'
            ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: property.price, priceCurrency: 'EGP', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' } } }
            : { price: property.price, priceCurrency: 'EGP' }),
        },
      } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'en' ? 'Home' : 'الرئيسية', item: 'https://alqirsh.online/' },
        { '@type': 'ListItem', position: 2, name: category, item: `https://alqirsh.online/properties/${propertyType === 'rental' ? 'rent' : 'sale'}` },
        { '@type': 'ListItem', position: 3, name: property.title },
      ],
    },
  ];

  return (
    <main className="app-shell min-h-screen"><JsonLd data={jsonLd} />
      <PublicHeader />
      <section className="page-container page-container--narrow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{t('العقارات')}</p>
            <h1 className="mt-2 text-3xl font-black"><LocalizedUserContent value={property.title} /></h1>
          </div>
          <Link href={propertyType === 'rental' ? '/properties/rent' : '/properties/sale'} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            {t('عودة')}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="panel overflow-hidden rounded-2xl">
            <ImageLightbox images={images} title={property.title} />
          </section>

          <section className="panel rounded-2xl p-6">
            <span className={`status-badge ${listingStatusClass(property.status)}`}>{t(listingStatusLabel(property.status, propertyType === 'rental' ? 'rent' : 'sale'))}</span>
            <p className="mt-5 text-2xl font-black text-[var(--brand)]">{formatEgpLocalized(property.price, locale)}{propertyType === 'rental' ? ` / ${t('شهرياً')}` : ''}</p>
            <div className="detail-facts mt-5 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-[var(--muted)]"><MapPin size={16} /> <LocalizedUserContent value={property.location || property.address || t('الموقع غير محدد')} /></p>
              <p>{t('نوع العقار')}: <b>{property.property_type ? translateEnum(property.property_type, locale) : '—'}</b></p>
              <p>{t('المساحة')}: <b>{formatNumber(property.area, locale)} {t('م²')}</b></p>
              <p>{t('عدد غرف النوم')}: <b>{formatNumber(property.bedrooms, locale)}</b></p>
              <p>{t('عدد الحمامات')}: <b>{formatNumber(property.bathrooms, locale)}</b></p>
              {property.facade && <p>{t('الواجهة')}: <b>{translateEnum(property.facade, locale)}</b></p>}
            </div>
            {property.description && <div className="mt-6 border-t border-[var(--line)] pt-5">
              <p className="eyebrow">{t('الوصف')}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-[var(--muted)]"><LocalizedUserContent value={property.description} /></p>
            </div>}
            <a href="tel:01090886364" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-white transition-opacity hover:opacity-90">
              <Phone size={18} aria-hidden="true" /> {t('اتصل الآن')}
            </a>
          </section>
        </div>
      </section><PublicFooter />
    </main>
  );
}
