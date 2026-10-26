'use client';
import { useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { ListingImage } from '@/components/listing-image';
import { formatEgpLocalized, listingStatusClass, listingStatusLabel } from '@/lib/listings';
import type { PublicPropertyCard } from '@/lib/public-catalogue';
import { useLanguage } from '@/components/language-provider';
import { translateEnum } from '@/lib/i18n';
import { LocalizedUserContent } from '@/components/localized-user-content';

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function PropertiesListingView({ view, offers }: { view: 'all' | 'sale' | 'rent'; offers: PublicPropertyCard[] }) {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Combine offers based on view
  const allOffers = useMemo(() => {
    if (view === 'sale') return offers.filter((offer) => offer.listingType === 'sale');
    if (view === 'rent') return offers.filter((offer) => offer.listingType === 'rental');
    return offers;
  }, [view, offers]);

  const allImages = useMemo(() => {
    return Object.fromEntries(allOffers.map((offer) => [offer.id, offer.images]));
  }, [allOffers]);

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
      const matchTypeFilter = !typeFilter || (typeFilter === 'sale' ? offer.listingType === 'sale' : offer.listingType === 'rental');

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
  }, [allOffers, location, propertyType, typeFilter, query]);

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
            placeholder={t('ابحث بالعنوان أو المنطقة أو النوع')}
          />
        </label>

        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">{t('كل الأنواع')}</option>
          {propertyTypes.map((type) => (
            <option key={type} value={type}>
              {translateEnum(type, locale)}
            </option>
          ))}
        </select>

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">{t('كل المناطق')}</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {translateEnum(loc, locale)}
            </option>
          ))}
        </select>

        {view === 'all' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
          >
            <option value="">{t('كل الأنواع')}</option>
            <option value="sale">{t('بيع فقط')}</option>
            <option value="rent">{t('إيجار فقط')}</option>
          </select>
        )}
      </section>

      {/* Results */}
      {filtered.length === 0 ? (
        <section className="panel mt-8 rounded-2xl p-10 text-center">
          <h2 className="font-black">{allOffers.length === 0 ? t('لا توجد عقارات متاحة حاليًا') : t('لا توجد نتائج مطابقة')}</h2>
          <button
            onClick={() => {
              setQuery('');
              setLocation('');
              setPropertyType('');
              setTypeFilter('');
            }}
            className="mt-4 text-sm font-bold text-[var(--brand)]"
          >
            {t('مسح البحث والفلتر')}
          </button>
          <Link href="/contact" className="mt-3 inline-block text-sm font-bold text-[var(--brand)] underline">{t('تواصل معنا')}</Link>
        </section>
      ) : (
        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((offer) => {
            const images = allImages[offer.id] || [];
            const isRental = offer.listingType === 'rental';
            return (
              <article key={offer.id} className="panel overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--canvas)]">
                  <ListingImage src={images[0]} alt={offer.title} fill sizes="(max-width: 639px) calc(50vw - 1.125rem), (max-width: 1023px) calc(50vw - 1.25rem), (max-width: 1279px) calc(33.333vw - 1.25rem), 18rem" className="h-full w-full object-cover" />
                  <span className="absolute right-3 top-3 rounded-full bg-[var(--brand)] px-2.5 py-1 text-[10px] font-bold text-white">
                    {t(isRental ? 'إيجار' : 'بيع')}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[var(--brand)]">{offer.property_type ? translateEnum(offer.property_type, locale) : '—'}</p>
                  <span className={`status-badge mt-2 ${listingStatusClass(offer.status)}`}>{t(listingStatusLabel(offer.status, isRental ? 'rent' : 'sale'))}</span>
                  <h2 className="mt-2 min-h-[2.5rem] text-sm font-black line-clamp-2"><LocalizedUserContent value={offer.title} /></h2>
                  <div className="mt-2 flex items-center gap-1 text-xs text-[var(--muted)]">
                    <MapPin size={12} />
                    <LocalizedUserContent value={offer.location} />
                  </div>
                  {offer.bedrooms && (
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {offer.bedrooms} {t('غرف')} • {offer.bathrooms || '—'} {t('حمام')}
                    </p>
                  )}
                  <p className="mt-3 text-lg font-black text-[var(--brand)]">
                    {formatEgpLocalized(offer.price, locale)}{isRental ? ` / ${t('شهرياً')}` : ''}
                  </p>
                  <Link
                    href={`/properties/${offer.id}${isRental ? '?type=rental' : ''}`}
                    className="mt-3 block rounded-lg border border-[var(--line)] py-2 text-center text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--canvas)]"
                  >
                    {t('التفاصيل')}
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
