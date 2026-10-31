import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, BusFront, CalendarDays, MapPin, Search, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { localizedMetadata } from '@/lib/metadata';
import { connection } from 'next/server';
import { cairoDateRange } from '@/lib/bus-time';
import { busImageUrl } from '@/lib/bus-images';

type Trip = {
  id: string;
  trip_code: string | null;
  bus_id: string | null;
  bus_type: string | null;
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string | null;
  price: number;
  capacity: number;
  bus_name: string;
  bus_image_url: string | null;
  services: string[];
  description: string | null;
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  return localizedMetadata({
    title: locale === 'en' ? 'Bus Trips | Alqirsh' : 'رحلات الباصات | القرش',
    description: locale === 'en'
      ? 'Browse published bus trips and departure details on Alqirsh.'
      : 'تعرّف على رحلات الباصات المنشورة ومواعيد الانطلاق على منصة القرش.',
    alternates: { canonical: '/trips' },
  });
}

function dateTime(value: string, locale: 'ar' | 'en') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
  }).format(new Date(value));
}

export default async function TripsPage({ searchParams }: PageProps<'/trips'>) {
  await connection();
  const params = await searchParams;
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  const en = locale === 'en';
  let trips: Trip[] = [];
  const seatCounts = new Map<string, number>();
  let unavailable = false;

  if (isSupabaseConfigured) {
    let query = createPublicClient()
      .from('bus_trips')
      .select('id,trip_code,bus_id,bus_type,origin,destination,departure_at,arrival_at,price,capacity,bus_name,bus_image_path,bus_image_url,services,description')
      .eq('status', 'published')
      .gt('departure_at', new Date().toISOString())
      .order('departure_at', { ascending: true })
      .limit(50);
    const from = typeof params.from === 'string' ? params.from.trim().slice(0, 120) : '';
    const to = typeof params.to === 'string' ? params.to.trim().slice(0, 120) : '';
    const date = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(params.date) ? params.date : '';
    if (from) query = query.ilike('origin', `%${from.replace(/[%_]/gu, '')}%`);
    if (to) query = query.ilike('destination', `%${to.replace(/[%_]/gu, '')}%`);
    if (date) {
      const range = cairoDateRange(date);
      if (range) query = query.gte('departure_at', range.start.toISOString()).lt('departure_at', range.end.toISOString());
    }
    const { data, error } = await query;
    if (error) unavailable = true;
    else trips = (data ?? []).map((trip)=>({...trip,bus_image_url:trip.bus_image_path?busImageUrl(createPublicClient(),trip.bus_image_path):trip.bus_image_url??'/brand/alqirsh-logo.png'})) as Trip[];
  } else unavailable = true;

  if (!unavailable) await Promise.all(trips.filter((trip) => trip.bus_id).map(async (trip) => {
    const { data } = await createPublicClient().rpc('get_public_trip_seats', { p_trip_id: trip.id });
    seatCounts.set(trip.id, (data ?? []).filter((seat: { is_available: boolean }) => seat.is_available).length);
  }));

  const BackArrow = en ? ArrowLeft : ArrowRight;
  return <main className="app-shell min-h-screen">
    <PublicHeader />
    <section className="hero-shell">
      <div className="page-container py-10 sm:py-14">
        <p className="eyebrow text-[var(--on-brand-muted)]">{en ? 'TRAVEL WITH ALQIRSH' : 'السفر مع القرش'}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">{en ? 'Bus trips and booking' : 'رحلات وحجز الباصات'}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--on-brand-muted)] sm:text-base">
          {en ? 'Explore published trips, departure times and available capacity.' : 'استعرض الرحلات المنشورة ومواعيد الانطلاق والسعة المتاحة.'}
        </p>
        <form action="/trips" className="mt-8 grid max-w-5xl gap-3 rounded-2xl bg-white p-3 shadow-[0_18px_50px_rgb(3_26_20_/_22%)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] px-4"><MapPin size={18} className="shrink-0 text-[var(--brand)]" /><span className="sr-only">{en ? 'From' : 'من'}</span><input name="from" defaultValue={typeof params.from === 'string' ? params.from : ''} placeholder={en ? 'From city' : 'مدينة المغادرة'} className="w-full bg-transparent text-sm text-[var(--ink)] outline-none" /></label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] px-4"><MapPin size={18} className="shrink-0 text-[var(--brand)]" /><span className="sr-only">{en ? 'To' : 'إلى'}</span><input name="to" defaultValue={typeof params.to === 'string' ? params.to : ''} placeholder={en ? 'To city' : 'مدينة الوصول'} className="w-full bg-transparent text-sm text-[var(--ink)] outline-none" /></label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line)] px-4"><CalendarDays size={18} className="shrink-0 text-[var(--brand)]" /><span className="sr-only">{en ? 'Travel date' : 'تاريخ السفر'}</span><input name="date" type="date" defaultValue={typeof params.date === 'string' ? params.date : ''} min={new Date().toISOString().slice(0, 10)} aria-label={en ? 'Travel date' : 'تاريخ السفر'} className="w-full bg-transparent text-sm text-[var(--ink)] outline-none" /></label>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold text-white"><Search size={17} />{en ? 'Search trips' : 'ابحث عن رحلة'}</button>
        </form>
      </div>
    </section>
    <section className="page-container">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow">{en ? 'UPCOMING DEPARTURES' : 'مواعيد الانطلاق القادمة'}</p><h2 className="mt-1 text-2xl font-black">{en ? 'Published trips' : 'الرحلات المنشورة'}</h2></div><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"><BackArrow size={16} />{en ? 'Home' : 'الرئيسية'}</Link></div>
      {unavailable ? <div className="panel rounded-2xl p-8 text-center"><BusFront className="mx-auto text-[var(--brand)]" size={30} /><h3 className="mt-3 font-black">{en ? 'Trip schedules are being prepared' : 'جداول الرحلات قيد الإعداد'}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">{en ? 'Published departures will appear here when the trip catalogue is available.' : 'ستظهر مواعيد الانطلاق المنشورة هنا عند توفر جدول الرحلات.'}</p></div>
      : trips.length === 0 ? <div className="panel rounded-2xl p-8 text-center"><BusFront className="mx-auto text-[var(--brand)]" size={30} /><h3 className="mt-3 font-black">{en ? 'No upcoming trips yet' : 'لا توجد رحلات قادمة حالياً'}</h3><p className="mt-2 text-sm text-[var(--muted)]">{en ? 'Please check again soon.' : 'يرجى العودة للاطلاع على المواعيد الجديدة.'}</p></div>
      : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{trips.map((trip) => <article key={trip.id} className="panel overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/10] bg-[var(--muted-surface)]"><Image src={trip.bus_image_url??'/brand/alqirsh-logo.png'} alt={trip.bus_name} fill unoptimized sizes="(max-width: 639px) calc(50vw - 1rem), (max-width: 1023px) calc(50vw - 1.25rem), (max-width: 1279px) 33vw, 18rem" className="object-cover" /></div>
        <div className="p-3 sm:p-4"><p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--brand)] sm:text-xs"><BusFront size={14}/><span className="line-clamp-1">{trip.bus_name}</span></p><div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5"><div className="min-w-0"><span className="block text-[9px] font-bold text-[var(--muted)] sm:text-[10px]">{en ? 'Departure' : '\u0645\u063a\u0627\u062f\u0631\u0629'}</span><p className="line-clamp-2 text-sm font-black leading-5 sm:text-base">{trip.origin}</p></div><span aria-hidden="true" className="text-sm font-bold text-[var(--brand)]">{String.fromCharCode(0x2192)}</span><div className="min-w-0"><span className="block text-[9px] font-bold text-[var(--muted)] sm:text-[10px]">{en ? 'Arrival' : '\u0627\u0644\u0648\u0635\u0648\u0644'}</span><p className="line-clamp-2 text-sm font-black leading-5 sm:text-base">{trip.destination}</p></div></div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-5 text-[var(--muted)]"><CalendarDays size={13} className="shrink-0"/><span className="line-clamp-1">{dateTime(trip.departure_at, locale)}</span></p>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2"><span className="text-[10px] text-[var(--muted)] sm:text-xs"><UsersRound size={12} className="me-1 inline"/>{seatCounts.has(trip.id) ? (en ? `${seatCounts.get(trip.id)} seats available` : `${new Intl.NumberFormat('ar-EG').format(seatCounts.get(trip.id)!)} ${String.fromCharCode(0x0645,0x0642,0x0639,0x062f,0x20,0x0645,0x062a,0x0627,0x062d)}`) : (en ? `${trip.capacity} seats` : `${new Intl.NumberFormat('ar-EG').format(trip.capacity)} ${String.fromCharCode(0x0645,0x0642,0x0639,0x062f)}`)}</span><strong className="text-sm font-black text-[var(--brand)] sm:text-base">{new Intl.NumberFormat(en ? 'en-EG' : 'ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(trip.price)}</strong></div>
        {trip.bus_id ? <Link href={`/trips/${trip.id}/book`} className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-[var(--brand)] px-2 text-center text-xs font-bold text-white sm:text-sm">{en ? 'Trip details' : '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0631\u062d\u0644\u0629'}</Link> : <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-2 text-[10px] leading-5 text-[var(--muted)]">{en ? 'Booking unavailable' : '\u0627\u0644\u062d\u062c\u0632 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d'}</p>}</div>
      </article>)}</div>}
    </section>
    <PublicFooter />
  </main>;
}
