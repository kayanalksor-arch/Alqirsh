import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { ImageLightbox } from '@/components/image-lightbox';
import { JsonLd } from '@/components/json-ld';
import { getPublicPropertyPageData } from '@/lib/public-catalogue';
import { formatEgp, indexableListingStatuses, listingStatusClass, listingStatusLabel } from '@/lib/listings';

type PropertyDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string | string[] }>;
};

const listingTypeFrom = (type: string | string[] | undefined): 'sale' | 'rental' => type === 'rental' ? 'rental' : 'sale';

export async function generateMetadata({ params, searchParams }: PropertyDetailsPageProps): Promise<Metadata> {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const listingType = listingTypeFrom(search.type);
  const data = await getPublicPropertyPageData(id, listingType);
  if (!data) return { title: 'العقار غير موجود', robots: { index: false, follow: false } };
  const { property } = data;
  const typeLabel = listingType === 'rental' ? 'للإيجار' : 'للبيع';
  const title = [property.property_type, typeLabel, property.location].filter(Boolean).join(' في ');
  const description = [property.description?.trim(), property.area ? `المساحة ${property.area} م²` : null, property.bedrooms ? `${property.bedrooms} غرف` : null, property.location].filter(Boolean).join('، ').slice(0, 300)
    || `تفاصيل ${property.property_type || 'عقار'} ${typeLabel} على منصة القِرش.`;
  const canonical = `/properties/${property.id}${listingType === 'rental' ? '?type=rental' : ''}`;
  const indexable = indexableListingStatuses.includes(property.status as (typeof indexableListingStatuses)[number]);
  return {
    title: `${title || property.title} | ${property.title}`,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true, 'max-image-preview': 'large' } : { index: false, follow: true },
    openGraph: { type: 'website', title, description, url: canonical, ...(data.images[0] ? { images: [{ url: data.images[0], alt: property.title }] } : {}) },
  };
}

export default async function PropertyDetailsPage({ params, searchParams }: PropertyDetailsPageProps) {
  const { id } = await params;
  const { type } = await searchParams;
  const propertyType = listingTypeFrom(type);
  const data = await getPublicPropertyPageData(id, propertyType);
  if (!data) notFound();
  const { property, images } = data;
  const category = propertyType === 'rental' ? 'عقارات للإيجار' : 'عقارات للبيع';
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'RealEstateListing',
      name: property.title, url: `https://alqirsh.online/properties/${property.id}${propertyType === 'rental' ? '?type=rental' : ''}`,
      ...(property.description ? { description: property.description } : {}),
      ...(images.length ? { image: images } : {}),
      ...(property.location || property.address ? { address: { '@type': 'PostalAddress', addressLocality: property.location || property.address, addressCountry: 'EG' } } : {}),
      ...(property.price != null ? { offers: { '@type': 'Offer', price: property.price, priceCurrency: 'EGP', availability: property.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability' } } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://alqirsh.online/' },
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
            <p className="eyebrow">العقارات</p>
            <h1 className="mt-2 text-3xl font-black">{property.title}</h1>
          </div>
          <Link href={propertyType === 'rental' ? '/properties/rent' : '/properties/sale'} className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            العودة
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="panel overflow-hidden rounded-2xl">
            <ImageLightbox images={images} title={property.title} />
          </section>

          <section className="panel rounded-2xl p-6">
            <span className={`status-badge ${listingStatusClass(property.status)}`}>{listingStatusLabel(property.status, propertyType === 'rental' ? 'rent' : 'sale')}</span>
            <p className="mt-5 text-2xl font-black text-[var(--brand)]">{formatEgp(property.price)}{propertyType === 'rental' ? ' / شهرياً' : ''}</p>
            <div className="detail-facts mt-5 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-[var(--muted)]"><MapPin size={16} /> {property.location || property.address || 'الموقع غير محدد'}</p>
              <p>نوع العقار: <b>{property.property_type || '—'}</b></p>
              <p>المساحة: <b>{property.area ?? '—'} م²</b></p>
              <p>الغرف: <b>{property.bedrooms ?? '—'}</b></p>
              <p>الحمامات: <b>{property.bathrooms ?? '—'}</b></p>
            </div>
            {property.description && <p className="mt-6 border-t border-[var(--line)] pt-5 text-sm leading-8 text-[var(--muted)]">{property.description}</p>}
          </section>
        </div>
      </section><PublicFooter />
    </main>
  );
}
