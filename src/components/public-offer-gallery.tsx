'use client';
/* eslint-disable @next/next/no-img-element */

import { BedDouble, Download, MapPin, Maximize2, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

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

  const formatNumber = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export function PublicOfferGallery({ offers, images, rental }: { offers: Offer[]; images: Record<string, string[]>; rental: boolean }) {
  const [selected, setSelected] = useState<Offer | null>(null);
  const [active, setActive] = useState(0);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const locations = useMemo(() => [...new Set(offers.map((offer) => offer.location).filter(Boolean))] as string[], [offers]);
  const propertyTypes = useMemo(() => [...new Set(offers.map((offer) => offer.property_type).filter(Boolean))] as string[], [offers]);

  const shown = useMemo(
    () =>
      offers.filter((offer) => {
        const matchesLocation = !location || offer.location === location;
        const matchesType = !propertyType || offer.property_type === propertyType;
        const haystack = [offer.title, offer.location, offer.address, offer.property_type, offer.description].filter(Boolean).join(' ');
        const normalizedQuery = normalizeSearchText(query);
        const normalizedHaystack = normalizeSearchText(haystack);
        return matchesLocation && matchesType && (normalizedQuery === '' || normalizedHaystack.includes(normalizedQuery));
      }),
    [location, offers, propertyType, query],
  );

  const open = (offer: Offer) => {
    setSelected(offer);
    setActive(0);
  };

  return (
    <>
      <section className="panel mt-8 grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_220px]">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="ابحث بالعنوان أو المنطقة أو النوع أو الوصف"
          />
        </label>

        <select
          value={propertyType}
          onChange={(event) => setPropertyType(event.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">كل الأنواع</option>
          {propertyTypes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">كل المناطق</option>
          {locations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>

      {shown.length === 0 ? (
        <section className="panel mt-5 rounded-2xl p-10 text-center">
          <h2 className="font-black">لا توجد نتائج مطابقة</h2>
          <button type="button" onClick={() => { setQuery(''); setLocation(''); setPropertyType(''); }} className="mt-4 text-sm font-bold text-[var(--brand)]">
            مسح البحث والفلتر
          </button>
        </section>
      ) : (
        <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((offer) => {
            const photo = images[offer.id]?.[0];
            return (
              <button key={offer.id} type="button" onClick={() => open(offer)} className="panel overflow-hidden rounded-2xl text-right transition hover:-translate-y-1 hover:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]">
                {photo ? (
                  <img src={photo} alt={offer.title} className="h-36 w-full object-cover sm:h-52" />
                ) : (
                  <div className="grid h-36 place-items-center bg-[var(--canvas)] text-xs text-[var(--muted)] sm:h-52 sm:text-sm">لا توجد صورة</div>
                )}
                <div className="p-3 sm:p-5">
                  <p className="text-[10px] font-bold text-[var(--brand)] sm:text-xs">{offer.property_type ?? (rental ? 'عقار للإيجار' : 'عقار للبيع')}</p>
                  <h2 className="mt-2 text-base font-black sm:text-xl">{offer.title}</h2>
                  <p className="mt-2 text-base font-black text-[var(--brand)] sm:mt-3 sm:text-xl">{formatNumber(offer.price)} ج.م{rental ? ' شهرياً' : ''}</p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--muted)] sm:mt-3 sm:gap-2 sm:text-sm"><MapPin size={14} className="shrink-0 sm:size-4" />{offer.location ?? 'الموقع غير محدد'}</p>
                  {offer.address && <p className="mt-2 text-[10px] text-[var(--muted)] sm:text-sm">{offer.address}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[var(--muted)] sm:mt-4 sm:text-sm">
                    <span>المساحة: {formatNumber(offer.area)} م²</span>
                    <span>{formatNumber(offer.bedrooms)} غرف</span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--surface)] shadow-2xl">
            <button type="button" onClick={() => setSelected(null)} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/20 text-white" aria-label="إغلاق">
              <X size={18} />
            </button>

            {images[selected.id]?.length ? (
              <div className="grid gap-2 bg-[var(--canvas)] p-2 md:grid-cols-[1.2fr_.8fr]">
                {images[selected.id].map((src, index) => (
                  <button key={src + index} type="button" onClick={() => setFullImage(src)} className={index === active ? 'block w-full cursor-zoom-in' : 'hidden'} aria-label="فتح الصورة بالحجم الكامل">
                    <img src={src} alt={selected.title} className="h-80 w-full rounded-2xl object-cover" />
                  </button>
                ))}

                {images[selected.id].length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto px-2 pb-2">
                    {images[selected.id].map((src, index) => (
                      <button key={src} type="button" onClick={() => setActive(index)} className={`h-16 w-16 overflow-hidden rounded-xl border ${index === active ? 'border-[var(--brand)]' : 'border-[var(--line)]'}`}>
                        <img src={src} alt={`${selected.title} ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-80 place-items-center bg-[var(--canvas)] text-[var(--muted)]">لا توجد صورة</div>
            )}

            <div className="p-6 md:p-8">
              <p className="text-xs font-bold text-[var(--brand)]">{selected.property_type ?? (rental ? 'عقار للإيجار' : 'عقار للبيع')}</p>
              <h2 className="mt-2 text-2xl font-black">{selected.title}</h2>
              <p className="mt-3 text-2xl font-black text-[var(--brand)]">{formatNumber(selected.price)} ج.م{rental ? ' شهرياً' : ''}</p>

              {selected.description && <p className="mt-5 leading-7 text-[var(--muted)]">{selected.description}</p>}

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <span className="flex gap-2"><MapPin size={17} />{selected.location ?? 'الموقع غير محدد'}{selected.address ? ` — ${selected.address}` : ''}</span>
                <span className="flex gap-2"><Maximize2 size={17} />{formatNumber(selected.area)} م²</span>
                <span className="flex gap-2"><BedDouble size={17} />{formatNumber(selected.bedrooms)} غرف نوم</span>
                <span>الحمامات: {formatNumber(selected.bathrooms)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullImage && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="معاينة الصورة بالحجم الكامل">
          <button type="button" onClick={() => setFullImage(null)} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label="إغلاق الصورة">
            <X size={20} />
          </button>
          <img src={fullImage} alt="صورة العرض بالحجم الكامل" className="max-h-[82vh] max-w-full object-contain" />
          <a href={fullImage} download className="absolute bottom-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900">
            <Download size={17} /> تنزيل الصورة
          </a>
        </div>
      )}
    </>
  );
}
