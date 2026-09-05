import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { ImageLightbox } from '@/components/image-lightbox';
import { formatEgp, listingStatusClass, listingStatusLabel, publicListingStatuses } from '@/lib/listings';

type PropertyDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function PropertyDetailsPage({ params, searchParams }: PropertyDetailsPageProps) {
  if (!isSupabaseConfigured) notFound();

  const { id } = await params;
  const { type } = await searchParams;
  const propertyType = type === 'rental' ? 'rental' : 'sale';
  const table = propertyType === 'rental' ? 'rental_offers' : 'sale_offers';
  const db = await createClient();
  const { data: property, error } = await db
    .from(table)
    .select('id,title,description,property_type,price,location,address,map_url,area,bedrooms,bathrooms,facade,status')
    .eq('id', id)
    .in('status', publicListingStatuses)
    .maybeSingle();

  if (error || !property) notFound();

  const { data: media } = await db
    .from('property_images')
    .select('image_url,image_path,sort_order')
    .eq('property_id', id)
    .eq('property_type', propertyType)
    .order('sort_order');

  const images = (media ?? []).map((image) =>
    image.image_url || db.storage.from('listing-images').getPublicUrl(image.image_path).data.publicUrl,
  );

  return (
    <main className="app-shell min-h-screen">
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
            <div className="mt-5 space-y-3 text-sm">
              <p className="flex items-center gap-2 text-[var(--muted)]"><MapPin size={16} /> {property.location || property.address || 'الموقع غير محدد'}</p>
              <p>نوع العقار: <b>{property.property_type || '—'}</b></p>
              <p>المساحة: <b>{property.area ?? '—'} م²</b></p>
              <p>الغرف: <b>{property.bedrooms ?? '—'}</b></p>
              <p>الحمامات: <b>{property.bathrooms ?? '—'}</b></p>
            </div>
            {property.description && <p className="mt-6 border-t border-[var(--line)] pt-5 text-sm leading-8 text-[var(--muted)]">{property.description}</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
