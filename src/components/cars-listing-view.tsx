'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/listings';

type Vehicle = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  listing_type: 'sale' | 'rent';
  price: number | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  fuel_type: string | null;
  transmission: string | null;
  mileage: number | null;
  location: string | null;
  image_url: string | null;
};

export function CarsListingView({ view }: { view: 'all' | 'sale' | 'rent' }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVehicles = async () => {
      const db = createClient();
      const { data, error: loadError } = await db
        .from('vehicle_listings')
        .select('id,title,brand,model,year,listing_type,price,daily_price,weekly_price,monthly_price,fuel_type,transmission,mileage,location,image_url')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (loadError) {
        setError(loadError.message);
      } else {
        setVehicles((data ?? []) as Vehicle[]);
      }
      setLoading(false);
    };

    void loadVehicles();
  }, []);

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

  if (loading) {
    return <div className="panel mt-8 rounded-2xl p-10 text-center text-[var(--muted)]">جارٍ تحميل السيارات...</div>;
  }

  if (error) {
    return <div className="panel mt-8 rounded-2xl p-6 text-center text-red-600">تعذر تحميل السيارات: {error}</div>;
  }

  return (
    <>
      <section className="panel mt-8 grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px]">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="ابحث بالاسم أو الماركة أو الموديل" />
        </label>
        <select value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold">
          <option value="">كل المناطق</option>
          {locations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>

      {visibleVehicles.length === 0 ? (
        <section className="panel mt-8 rounded-2xl p-10 text-center">
          <h2 className="font-black">لا توجد سيارات مطابقة</h2>
          <button type="button" onClick={() => { setQuery(''); setLocation(''); }} className="mt-4 text-sm font-bold text-[var(--brand)]">مسح البحث والفلتر</button>
        </section>
      ) : (
        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleVehicles.map((vehicle) => {
            const price = vehicle.listing_type === 'rent'
              ? vehicle.daily_price ?? vehicle.weekly_price ?? vehicle.monthly_price ?? 0
              : vehicle.price ?? 0;
            return (
              <article key={vehicle.id} className="panel overflow-hidden rounded-2xl">
                <div className="relative h-52 bg-[var(--canvas)]">
                  {vehicle.image_url ? <img src={vehicle.image_url} alt={vehicle.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[var(--muted)]">لا توجد صورة</div>}
                  <span className="absolute right-3 top-3 rounded-full bg-[var(--brand)] px-2.5 py-1 text-[10px] font-bold text-white">{vehicle.listing_type === 'sale' ? 'بيع' : 'إيجار'}</span>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-[var(--brand)]">{vehicle.brand ?? 'ماركة'} · {vehicle.model ?? 'موديل'}</p>
                  <h2 className="mt-2 text-lg font-black">{vehicle.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                    <span>{vehicle.year ?? '—'}</span><span>•</span><span>{vehicle.mileage ? `${formatMoney(vehicle.mileage)} كم` : 'كم غير محدد'}</span><span>•</span><span>{vehicle.transmission ?? 'ناقل حركة'}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1 text-[11px] text-[var(--muted)]"><MapPin size={12} />{vehicle.location ?? 'الموقع غير محدد'}</p>
                      <p className="mt-1 text-xl font-black text-[var(--brand)]">{formatMoney(price)} ر.س</p>
                    </div>
                    <Link href={`/cars/${vehicle.id}`} className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold text-[var(--ink)]">التفاصيل</Link>
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
