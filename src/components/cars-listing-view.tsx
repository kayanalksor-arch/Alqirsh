'use client';
import Link from 'next/link';
import { ListingImage } from '@/components/listing-image';
import { MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatEgpLocalized, listingStatusClass, listingStatusLabel } from '@/lib/listings';
import type { PublicCar } from '@/lib/public-catalogue';
import { useLanguage } from '@/components/language-provider';
import { translateEnum } from '@/lib/i18n';
import { LocalizedUserContent } from '@/components/localized-user-content';

export function CarsListingView({ view, vehicles }: { view: 'all' | 'sale' | 'rent'; vehicles: PublicCar[] }) {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  const visibleVehicles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesView = view === 'all' || vehicle.listing_type === view;
      const matchesLocation = !location || vehicle.location === location;
      const searchable = [vehicle.title, vehicle.brand, vehicle.model, vehicle.location, vehicle.fuel_type, vehicle.transmission]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return matchesView && matchesLocation && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [location, query, vehicles, view]);

  const locations = useMemo(
    () => [...new Set(vehicles.filter((vehicle) => view === 'all' || vehicle.listing_type === view).map((vehicle) => vehicle.location).filter(Boolean))] as string[],
    [vehicles, view],
  );

  return (
    <>
      <section className="panel mt-8 grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px]">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder={t('ابحث بالاسم أو الماركة أو الموديل')} />
        </label>
        <select value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold">
          <option value="">{t('كل المناطق')}</option>
          {locations.map((item) => <option key={item} value={item}>{translateEnum(item, locale)}</option>)}
        </select>
      </section>

      {visibleVehicles.length === 0 ? (
        <section className="panel mt-8 rounded-2xl p-10 text-center">
          <h2 className="font-black">{vehicles.length === 0 ? t('لا توجد سيارات متاحة حاليًا') : t('لا توجد سيارات مطابقة')}</h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm font-bold">
            <button type="button" onClick={() => { setQuery(''); setLocation(''); }} className="text-[var(--brand)]">{t('مسح البحث والفلتر')}</button>
            <Link href="/contact" className="text-[var(--brand)] underline">{t('تواصل معنا')}</Link>
          </div>
        </section>
      ) : (
        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
          {visibleVehicles.map((vehicle) => {
            const price = vehicle.listing_type === 'rent'
              ? vehicle.daily_price ?? vehicle.weekly_price ?? vehicle.monthly_price ?? 0
              : vehicle.price ?? 0;
            return (
              <article key={vehicle.id} className="panel overflow-hidden rounded-2xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--canvas)]">
                  <ListingImage src={vehicle.image_url} alt={vehicle.title} fill sizes="(max-width: 639px) calc(50vw - 1.125rem), (max-width: 1279px) calc(50vw - 1.25rem), 25rem" className="h-full w-full object-cover" />
                  <span className="absolute right-3 top-3 rounded-full bg-[var(--brand)] px-2.5 py-1 text-[10px] font-bold text-white">{t(vehicle.listing_type === 'sale' ? 'بيع' : 'إيجار')}</span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[var(--brand)]"><LocalizedUserContent value={vehicle.brand ?? t('ماركة')} /> · <LocalizedUserContent value={vehicle.model ?? t('موديل')} /></p>
                  <span className={`status-badge mt-2 ${listingStatusClass(vehicle.status)}`}>{t(listingStatusLabel(vehicle.status, vehicle.listing_type))}</span>
                  <h2 className="mt-2 min-h-[3.5rem] text-lg font-black line-clamp-2"><LocalizedUserContent value={vehicle.title} /></h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                    <span>{vehicle.year ?? '—'}</span><span>•</span><span>{vehicle.mileage ? `${new Intl.NumberFormat(locale === 'en' ? 'en-EG' : 'ar-EG').format(vehicle.mileage)} ${t('كم')}` : t('كم غير محدد')}</span><span>•</span><span>{vehicle.transmission ? translateEnum(vehicle.transmission, locale) : t('ناقل حركة')}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1 text-[11px] text-[var(--muted)]"><MapPin size={12} /><LocalizedUserContent value={vehicle.location ?? t('الموقع غير محدد')} /></p>
                      <p className="mt-1 text-xl font-black text-[var(--brand)]">{formatEgpLocalized(price, locale)}</p>
                    </div>
                    <Link href={`/cars/${vehicle.id}`} className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--ink)]">{t('التفاصيل')}</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
