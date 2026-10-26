import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, CarFront, MapPin, Phone, Tag } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { ImageLightbox } from '@/components/image-lightbox';
import { JsonLd } from '@/components/json-ld';
import { getPublicCar } from '@/lib/public-catalogue';
import { formatEgpLocalized, formatNumber, indexableListingStatuses, listingStatusClass, listingStatusLabel } from '@/lib/listings';
import { cookies } from 'next/headers';
import { translate, translateEnum } from '@/lib/i18n';
import { LocalizedUserContent } from '@/components/localized-user-content';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [listing, cookieStore] = await Promise.all([getPublicCar(id), cookies()]);
  const locale = cookieStore.get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  if (!listing) return { title: locale === 'en' ? 'Car not found | Alqirsh' : 'السيارة غير موجودة | القرش', robots: { index: false, follow: false } };
  const kind = listing.listing_type === 'rent' ? (locale === 'en' ? 'for rent' : 'للإيجار') : (locale === 'en' ? 'for sale' : 'للبيع');
  const titleHasListingType = /\bfor (sale|rent)\b|للبيع|للإيجار/iu.test(listing.title);
  const seoTitle = titleHasListingType ? listing.title : `${listing.title} ${kind}`;
  const title = locale === 'en'
    ? `${seoTitle}${listing.location ? ` in ${listing.location}` : ''}`
    : `${seoTitle}${listing.location ? ` في ${listing.location}` : ''}`;
  const normalizedTitle = title.replace(/\s{2,}/gu, ' ').trim();
  const arabicDescription = Boolean(listing.description && /[\u0600-\u06ff]/u.test(listing.description));
  const facts = locale === 'en'
    ? [listing.brand, listing.model, listing.year, listing.fuel_type ? translateEnum(listing.fuel_type, locale) : null, listing.transmission ? translateEnum(listing.transmission, locale) : null, listing.location].filter(Boolean)
    : [listing.brand, listing.model, listing.year, listing.fuel_type, listing.transmission, listing.location].filter(Boolean);
  const description = locale === 'en'
    ? [listing.description && !arabicDescription ? listing.description.trim() : null, facts.length ? facts.join(', ') : null, `Vehicle ${kind}.`, arabicDescription ? 'The original description is in Arabic.' : null].filter(Boolean).join('. ').slice(0, 160)
    : [listing.description?.trim(), facts.join('، ')].filter(Boolean).join(' — ').slice(0, 160)
      || `تفاصيل سيارة ${listing.title} ${kind} على منصة القرش.`;
  const indexable = indexableListingStatuses.includes(listing.status as (typeof indexableListingStatuses)[number]);
  return {
    title: normalizedTitle,
    description,
    alternates: { canonical: `/cars/${listing.id}` },
    robots: indexable ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: true },
    openGraph: { type: 'website', title: `${normalizedTitle} | Alqirsh`, description, url: `/cars/${listing.id}`, ...(listing.image_url ? { images: [{ url: listing.image_url, alt: listing.title }] } : {}) },
    twitter: { card: 'summary_large_image', title: `${normalizedTitle} | Alqirsh`, description, ...(listing.image_url ? { images: [listing.image_url] } : {}) },
  };
}

export default async function CarDetailPage({ params }: Props) {
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const t = (text: string) => translate(text, locale);
  const { id } = await params;
  const listing = await getPublicCar(id);
  if (!listing) notFound();

  const price = listing.listing_type === 'rent'
    ? (listing.daily_price ?? listing.weekly_price ?? listing.monthly_price ?? 0)
    : (listing.price ?? 0);

  const gallery = listing.image_url ? [listing.image_url] : [];
  const category = listing.listing_type === 'rent'
    ? (locale === 'en' ? 'Cars for Rent' : 'سيارات للإيجار')
    : (locale === 'en' ? 'Cars for Sale' : 'سيارات للبيع');
  const rentalPrice = listing.daily_price ?? listing.weekly_price ?? listing.monthly_price;
  const rentalUnit = listing.daily_price != null ? 'DAY' : listing.weekly_price != null ? 'WEEK' : 'MON';
  const offerPrice = listing.listing_type === 'rent' ? rentalPrice : listing.price;
  const offerAvailability = listing.status === 'available' ? 'https://schema.org/InStock' : listing.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/OutOfStock';
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Car',
      name: listing.title, url: `https://alqirsh.online/cars/${listing.id}`,
      ...(listing.description ? { description: listing.description } : {}),
      ...(listing.image_url ? { image: [listing.image_url] } : {}),
      ...(listing.brand ? { brand: listing.brand } : {}), ...(listing.model ? { model: listing.model } : {}),
      ...(listing.year ? { vehicleModelDate: String(listing.year) } : {}),
      ...(listing.fuel_type ? { fuelType: listing.fuel_type } : {}),
      ...(listing.transmission ? { vehicleTransmission: listing.transmission } : {}),
      ...(listing.mileage ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.mileage, unitCode: 'KMT' } } : {}),
      ...(offerPrice != null ? {
        offers: {
          '@type': 'Offer', url: `https://alqirsh.online/cars/${listing.id}`,
          businessFunction: listing.listing_type === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
          availability: offerAvailability,
          ...(listing.listing_type === 'rent'
            ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: offerPrice, priceCurrency: 'EGP', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: rentalUnit } } }
            : { price: offerPrice, priceCurrency: 'EGP' }),
        },
      } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'en' ? 'Home' : 'الرئيسية', item: 'https://alqirsh.online/' },
        { '@type': 'ListItem', position: 2, name: category, item: `https://alqirsh.online${listing.listing_type === 'rent' ? '/cars/rent' : '/cars/sale'}` },
        { '@type': 'ListItem', position: 3, name: listing.title },
      ],
    },
  ];

  return (
    <main className="app-shell min-h-screen"><JsonLd data={jsonLd} />
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">{t('تفاصيل السيارة')}</p>
            <h1 className="mt-2 text-3xl font-black"><LocalizedUserContent value={listing.title} /></h1>
          </div>
          <Link href={listing.listing_type === 'rent' ? '/cars/rent' : '/cars/sale'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            <ArrowLeft size={16} /> {t('عودة')}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="panel overflow-hidden rounded-[2rem] p-3">
            <ImageLightbox images={gallery} title={listing.title} />
          </article>

          <aside className="panel rounded-[2rem] p-5">
            <span className={`status-badge ${listingStatusClass(listing.status)}`}>{t(listingStatusLabel(listing.status, listing.listing_type))}</span>
            <h2 className="mt-3 text-2xl font-black">{formatEgpLocalized(price, locale)}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]"><LocalizedUserContent value={listing.location ?? t('الموقع غير محدد')} /></p>

            <div className="detail-facts mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>{t('الماركة')}</span><b><LocalizedUserContent value={listing.brand ?? '—'} /></b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>{t('الموديل')}</span><b><LocalizedUserContent value={listing.model ?? '—'} /></b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>{t('سنة الصنع')}</span><b>{listing.year != null ? formatNumber(listing.year, locale) : '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>{t('نوع الوقود')}</span><b>{listing.fuel_type ? translateEnum(listing.fuel_type, locale) : '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>{t('ناقل الحركة')}</span><b>{listing.transmission ? translateEnum(listing.transmission, locale) : '—'}</b></div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a href="tel:01090886364" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-white transition-opacity hover:opacity-90">
                <Phone size={18} aria-hidden="true" /> {t('اتصل الآن')}
              </a>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 font-bold text-[var(--ink)]">
                <Phone size={18} aria-hidden="true" /> {t('تواصل معنا')}
              </Link>
            </div>
          </aside>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="panel rounded-[2rem] p-6">
            <p className="eyebrow">{t('الوصف')}</p>
            <p className="mt-4 whitespace-pre-wrap leading-8 text-[var(--muted)]">{listing.description ? <LocalizedUserContent value={listing.description} /> : t('لا يوجد وصف إضافي لهذا الإعلان.')}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">{t('الفئة')}</p><p className="mt-1 font-bold">{listing.variant ? translateEnum(listing.variant, locale) : t('غير محدد')}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">{t('عدد الكيلومترات')}</p><p className="mt-1 font-bold">{listing.mileage ? `${formatNumber(Number(listing.mileage), locale)} ${t('كم')}` : t('غير محدد')}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">{t('اللون')}</p><p className="mt-1 font-bold">{listing.color ? translateEnum(listing.color, locale) : t('غير محدد')}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">{t('حالة الإعلان')}</p><p className="mt-1 font-bold">{t(listingStatusLabel(listing.status, listing.listing_type))}</p></div>
            </div>
          </article>

          <aside className="panel rounded-[2rem] p-6">
            <p className="eyebrow">{t('معلومات الإعلان')}</p>
            <div className="detail-facts mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><CalendarDays size={16} /> {t('تاريخ الإضافة')}</span><b>{listing.created_at ? new Date(listing.created_at).toLocaleDateString(locale === 'en' ? 'en-EG' : 'ar-EG') : '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><MapPin size={16} /> {t('الموقع')}</span><b><LocalizedUserContent value={listing.location ?? '—'} /></b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><CarFront size={16} /> {t('حالة السيارة')}</span><b>{listing.condition ? translateEnum(listing.condition, locale) : t('مستعملة')}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><Tag size={16} /> {t('السعر')}</span><b>{formatEgpLocalized(price, locale)}</b></div>
            </div>
          </aside>
        </div>
      </section><PublicFooter />
    </main>
  );
}
