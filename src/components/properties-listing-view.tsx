'use client';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { formatEgp } from '@/lib/listings';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  address: string | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function PropertiesListingView({ view }: { view: 'all' | 'sale' | 'rent' }) {
  const [saleOffers, setSaleOffers] = useState<Offer[]>([]);
  const [rentOffers, setRentOffers] = useState<Offer[]>([]);
  const [saleImages, setSaleImages] = useState<Record<string, string[]>>({});
  const [rentImages, setRentImages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = createClient();

        // Fetch sale offers
        const { data: sales, error: saleError } = await db
          .from('sale_offers')
          .select('id,title,description,price,location,address,area,bedrooms,bathrooms,property_type')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (saleError) throw saleError;

        // Fetch rental offers
        const { data: rentals, error: rentError } = await db
          .from('rental_offers')
          .select('id,title,description,price,location,address,area,bedrooms,bathrooms,property_type')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (rentError) throw rentError;

        // Fetch images for sales
        const { data: saleMedia } = await db
          .from('property_images')
          .select('property_id,image_url,image_path,sort_order')
          .eq('property_type', 'sale')
          .order('sort_order');

        const saleImgs: Record<string, string[]> = {};
        for (const image of saleMedia ?? []) {
          const url =
            image.image_url ||
            db.storage.from('listing-images').getPublicUrl(image.image_path).data.publicUrl;
          saleImgs[image.property_id] = [...(saleImgs[image.property_id] ?? []), url];
        }
        setSaleImages(saleImgs);

        // Fetch images for rentals
        const { data: rentMedia } = await db
          .from('property_images')
          .select('property_id,image_url,image_path,sort_order')
          .eq('property_type', 'rental')
          .order('sort_order');

        const rentImgs: Record<string, string[]> = {};
        for (const image of rentMedia ?? []) {
          const url =
            image.image_url ||
            db.storage.from('listing-images').getPublicUrl(image.image_path).data.publicUrl;
          rentImgs[image.property_id] = [...(rentImgs[image.property_id] ?? []), url];
        }
        setRentImages(rentImgs);

        setSaleOffers((sales ?? []) as Offer[]);
        setRentOffers((rentals ?? []) as Offer[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  // Combine offers based on view
  const allOffers = useMemo(() => {
    if (view === 'sale') return saleOffers;
    if (view === 'rent') return rentOffers;
    return [...saleOffers, ...rentOffers];
  }, [view, saleOffers, rentOffers]);

  const allImages = useMemo(() => {
    if (view === 'sale') return saleImages;
    if (view === 'rent') return rentImages;
    return { ...saleImages, ...rentImages };
  }, [view, saleImages, rentImages]);

  const locations = useMemo(
    () => [...new Set(allOffers.map((o) => o.location).filter(Boolean))] as string[],
    [allOffers]
  );
  const propertyTypes = useMemo(
    () => [...new Set(allOffers.map((o) => o.property_type).filter(Boolean))] as string[],
    [allOffers]
  );

  const filtered = useMemo(() => {
    return allOffers.filter((offer) => {
      const matchLocation = !location || offer.location === location;
      const matchType = !propertyType || offer.property_type === propertyType;
      const matchTypeFilter = !typeFilter || (typeFilter === 'sale' ? view === 'all' && saleOffers.includes(offer) : view === 'all' && rentOffers.includes(offer));

      const haystack = [
        offer.title,
        offer.location,
        offer.address,
        offer.property_type,
        offer.description,
      ]
        .filter(Boolean)
        .join(' ');
      const normalizedQuery = normalizeSearchText(query);
      const normalizedHaystack = normalizeSearchText(haystack);
      const matchQuery = !normalizedQuery || normalizedHaystack.includes(normalizedQuery);

      return matchLocation && matchType && matchQuery && matchTypeFilter;
    });
  }, [allOffers, location, propertyType, typeFilter, query, view, saleOffers, rentOffers]);

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-[var(--line)] p-8 text-center text-[var(--muted)]">
        جارٍ التحميل...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:bg-red-950/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <section className="panel mt-8 grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_200px_200px] lg:grid-cols-[1fr_180px_180px_180px]">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            placeholder="ابحث بالعنوان أو المنطقة أو النوع"
          />
        </label>

        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">كل الأنواع</option>
          {propertyTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">كل المناطق</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        {view === 'all' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
          >
            <option value="">كل الأنواع</option>
            <option value="sale">بيع فقط</option>
            <option value="rent">إيجار فقط</option>
          </select>
        )}
      </section>

      {/* Results */}
      {filtered.length === 0 ? (
        <section className="panel mt-8 rounded-2xl p-10 text-center">
          <h2 className="font-black">لا توجد نتائج مطابقة</h2>
          <button
            onClick={() => {
              setQuery('');
              setLocation('');
              setPropertyType('');
              setTypeFilter('');
            }}
            className="mt-4 text-sm font-bold text-[var(--brand)]"
          >
            مسح البحث والفلتر
          </button>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((offer) => {
            const images = allImages[offer.id] || [];
            const isRental = rentOffers.some((r) => r.id === offer.id);
            return (
              <article key={offer.id} className="panel overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--canvas)]">
                  {images.length > 0 ? (
                    <Image src={images[0]} alt={offer.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
                      لا توجد صور
                    </div>
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-[var(--brand)] px-2.5 py-1 text-[10px] font-bold text-white">
                    {isRental ? 'إيجار' : 'بيع'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[var(--brand)]">{offer.property_type || '—'}</p>
                  <h2 className="mt-2 min-h-[2.5rem] text-sm font-black line-clamp-2">{offer.title}</h2>
                  <div className="mt-2 flex items-center gap-1 text-xs text-[var(--muted)]">
                    <MapPin size={12} />
                    {offer.location || '—'}
                  </div>
                  {offer.bedrooms && (
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {offer.bedrooms} غرف • {offer.bathrooms || '—'} حمام
                    </p>
                  )}
                  <p className="mt-3 text-lg font-black text-[var(--brand)]">
                    {formatEgp(offer.price)}{isRental ? ' / شهرياً' : ''}
                  </p>
                  <Link
                    href={`/properties/${offer.id}?type=${isRental ? 'rental' : 'sale'}`}
                    className="mt-3 block rounded-lg border border-[var(--line)] py-2 text-center text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--canvas)]"
                  >
                    التفاصيل
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
