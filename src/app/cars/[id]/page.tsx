import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, CalendarDays, CarFront, MapPin, Phone, Tag } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { ImageLightbox } from '@/components/image-lightbox';
import { JsonLd } from '@/components/json-ld';
import { getPublicCar } from '@/lib/public-catalogue';
import { formatEgp, indexableListingStatuses, listingStatusClass, listingStatusLabel } from '@/lib/listings';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getPublicCar(id);
  if (!listing) return { title: 'السيارة غير موجودة', robots: { index: false, follow: false } };
  const kind = listing.listing_type === 'rent' ? 'للإيجار' : 'للبيع';
  const title = [listing.title, listing.brand, listing.model, kind, listing.location].filter(Boolean).join(' | ');
  const facts = [listing.year, listing.fuel_type, listing.transmission, listing.location].filter(Boolean).join('، ');
  const description = `${listing.description?.trim() || `تفاصيل سيارة ${listing.title}`} ${facts ? `— ${facts}.` : ''}`.slice(0, 300);
  const indexable = indexableListingStatuses.includes(listing.status as (typeof indexableListingStatuses)[number]);
  return {
    title,
    description,
    alternates: { canonical: `/cars/${listing.id}` },
    robots: indexable ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: true },
    openGraph: { type: 'website', title, description, url: `/cars/${listing.id}`, ...(listing.image_url ? { images: [{ url: listing.image_url, alt: listing.title }] } : {}) },
  };
}

export default async function CarDetailPage({ params }: Props) {
  const { id } = await params;
  const listing = await getPublicCar(id);
  if (!listing) notFound();

  const price = listing.listing_type === 'rent'
    ? (listing.daily_price ?? listing.weekly_price ?? listing.monthly_price ?? 0)
    : (listing.price ?? 0);

  const gallery = listing.image_url ? [listing.image_url] : [];
  const category = listing.listing_type === 'rent' ? 'سيارات للإيجار' : 'سيارات للبيع';
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
      ...(listing.listing_type === 'sale' && listing.price != null ? { offers: { '@type': 'Offer', price: listing.price, priceCurrency: 'EGP', availability: listing.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' } } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://alqirsh.online/' },
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
            <p className="eyebrow">تفاصيل السيارة</p>
            <h1 className="mt-2 text-3xl font-black">{listing.title}</h1>
          </div>
          <Link href={listing.listing_type === 'rent' ? '/cars/rent' : '/cars/sale'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            <ArrowLeft size={16} /> العودة
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="panel overflow-hidden rounded-[2rem] p-3">
            <ImageLightbox images={gallery} title={listing.title} />
          </article>

          <aside className="panel rounded-[2rem] p-5">
            <span className={`status-badge ${listingStatusClass(listing.status)}`}>{listingStatusLabel(listing.status, listing.listing_type)}</span>
            <h2 className="mt-3 text-2xl font-black">{formatEgp(price)}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{listing.location ?? 'الموقع غير محدد'}</p>

            <div className="detail-facts mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>الماركة</span><b>{listing.brand ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>الموديل</span><b>{listing.model ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>السنة</span><b>{listing.year ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>الوقود</span><b>{listing.fuel_type ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>ناقل الحركة</span><b>{listing.transmission ?? '—'}</b></div>
            </div>

            <Link href="/contact" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-white">
              <Phone size={18} /> تواصل مع القِرش
            </Link>
          </aside>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="panel rounded-[2rem] p-6">
            <p className="eyebrow">الوصف</p>
            <p className="mt-4 leading-8 text-[var(--muted)]">{listing.description || 'لا يوجد وصف إضافي لهذا الإعلان.'}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">الفئة</p><p className="mt-1 font-bold">{listing.variant ?? 'غير محدد'}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">الكيلومترات</p><p className="mt-1 font-bold">{listing.mileage ? `${Number(listing.mileage).toLocaleString('ar-EG')} كم` : 'غير محدد'}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">اللون</p><p className="mt-1 font-bold">{listing.color ?? 'غير محدد'}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">حالة الإعلان</p><p className="mt-1 font-bold">{listingStatusLabel(listing.status, listing.listing_type)}</p></div>
            </div>
          </article>

          <aside className="panel rounded-[2rem] p-6">
            <p className="eyebrow">معلومات الإعلان</p>
            <div className="detail-facts mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><CalendarDays size={16} /> تاريخ الإضافة</span><b>{listing.created_at ? new Date(listing.created_at).toLocaleDateString('ar-EG') : '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><MapPin size={16} /> الموقع</span><b>{listing.location ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><CarFront size={16} /> حالة السيارة</span><b>{listing.condition ?? 'مستعملة'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><Tag size={16} /> السعر</span><b>{formatEgp(price)}</b></div>
            </div>
          </aside>
        </div>
      </section><PublicFooter />
    </main>
  );
}
