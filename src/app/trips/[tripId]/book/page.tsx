import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { BusFront, CalendarDays, MapPin } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { BusSeatBookingForm } from '@/components/bus-seat-booking-form';
import { createClient, createPublicClient } from '@/lib/supabase/server';
import { busImageUrl } from '@/lib/bus-images';
import { localizeBusService } from '@/lib/bus-services';

export const metadata = { robots: { index: false, follow: false, noarchive: true } };

type SeatLayout = { seat_id: string; seat_label: string; seat_type: string; row_number: number; seat_position: number; is_available: boolean };

export default async function BookTripPage({ params }: PageProps<'/trips/[tripId]/book'>) {
  const { tripId } = await params;
  if (!/^[0-9a-f-]{36}$/iu.test(tripId)) notFound();
  const publicDb = createPublicClient();
  const { data: trip } = await publicDb.from('bus_trips').select('id,trip_code,bus_id,bus_name,bus_image_path,bus_type,origin,destination,origin_station,destination_station,departure_at,arrival_at,price,capacity,services,instructions,status').eq('id', tripId).eq('status', 'published').maybeSingle();
  if (!trip || new Date(trip.departure_at) <= new Date()) notFound();
  const seatLayout = await publicDb.rpc('get_public_trip_seat_layout', { p_trip_id: trip.id });
  let seats: SeatLayout[] | null = seatLayout.data as SeatLayout[] | null;
  let seatError = seatLayout.error;
  if (seatError || !seats) {
    // Older deployments may have the availability RPC but not its expanded layout version.
    const legacyLayout = await publicDb.rpc('get_public_trip_seats', { p_trip_id: trip.id });
    if (!legacyLayout.error && legacyLayout.data) {
      seats = (legacyLayout.data as { seat_id: string; seat_label: string; seat_type: string; is_available: boolean }[]).map((seat, index) => {
        const match = /^(\d+)([a-z]+)$/iu.exec(seat.seat_label.trim());
        const positionFromLabel = match?.[2].toUpperCase().split('').reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
        return {
          ...seat,
          row_number: match ? Number(match[1]) : Math.floor(index / 4) + 1,
          seat_position: positionFromLabel || (index % 4) + 1,
        };
      });
      seatError = null;
    } else {
      seatError = legacyLayout.error ?? seatError;
      console.error('Could not load public bus seats:', seatError?.message);
    }
  }
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const en = (await cookies()).get('alqirsh-language')?.value === 'en';
  const t = (ar: string, english: string) => en ? english : ar;
  const fmt = (value: string) => new Intl.DateTimeFormat(en ? 'en-EG' : 'ar-EG', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value));
  return <main className="app-shell min-h-screen"><PublicHeader/><section className="page-container max-w-5xl">
    <div className="relative mb-5 aspect-[16/7] overflow-hidden rounded-2xl bg-[var(--canvas)]"><Image src={busImageUrl(publicDb,trip.bus_image_path)} alt={trip.bus_name} fill unoptimized sizes="(max-width: 1023px) 100vw, 900px" className="object-cover"/></div>
    <p className="eyebrow">{t('إتمام طلب الرحلة','BOOK YOUR TRIP')}</p><h1 className="mt-2 text-3xl font-black">{trip.origin} → {trip.destination}</h1>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><p className="panel flex items-center gap-2 rounded-xl p-3 text-sm"><CalendarDays size={18}/>{fmt(trip.departure_at)}</p><p className="panel flex items-center gap-2 rounded-xl p-3 text-sm"><BusFront size={18}/>{trip.bus_name} · {trip.bus_type ?? t('باص','Bus')}</p><div className="panel rounded-xl p-3 text-sm"><p className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--brand)]"><MapPin size={18}/>{en ? 'Route' : '\u0627\u0644\u0645\u0633\u0627\u0631'}</p><div className="grid grid-cols-2 gap-3"><div className="min-w-0"><span className="block text-xs text-[var(--muted)]">{en ? 'Departure' : '\u0645\u063a\u0627\u062f\u0631\u0629'}</span><p className="mt-1 font-bold">{trip.origin_station ?? trip.origin}</p></div><div className="min-w-0"><span className="block text-xs text-[var(--muted)]">{en ? 'Arrival' : '\u0627\u0644\u0648\u0635\u0648\u0644'}</span><p className="mt-1 font-bold">{trip.destination_station ?? trip.destination}</p></div></div></div></div>
    <p className="mt-4 text-sm text-[var(--muted)]">{t('سعر المقعد','Seat price')}: <strong className="text-[var(--brand)]">{new Intl.NumberFormat(en?'en-EG':'ar-EG',{style:'currency',currency:'EGP',maximumFractionDigits:2}).format(trip.price)}</strong> · {t('السعة','Capacity')}: {trip.capacity}</p>
    {!!trip.services?.length && <section className="panel mt-4 rounded-xl p-4"><h2 className="text-sm font-black">{en ? 'Available services' : 'الخدمات المتوفرة'}</h2><ul className="mt-3 flex flex-wrap gap-2">{trip.services.map((service: string)=><li key={service} className="rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">{localizeBusService(service,en?'en':'ar')}</li>)}</ul></section>}
    {trip.instructions && <p className="mt-4 rounded-xl bg-[var(--canvas)] p-4 text-sm leading-7">{trip.instructions}</p>}
    {!user ? <div className="panel mt-6 rounded-2xl p-6"><h2 className="font-black">{t('سجّل الدخول لإتمام الحجز','Sign in to book')}</h2><p className="mt-2 text-sm text-[var(--muted)]">{t('تُربط بيانات الحجز بحسابك لحماية التذاكر والإيصالات.','Bookings are tied to your account to protect tickets and receipts.')}</p><Link href={`/login?next=${encodeURIComponent(`/trips/${trip.id}/book`)}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--brand)] px-5 font-bold text-white">{t('تسجيل الدخول','Sign in')}</Link></div>
      : seatError || !seats ? <p role="alert" className="panel mt-6 rounded-xl p-5">{t('\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0642\u0627\u0639\u062f. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u062a\u0635\u0627\u0644\u0643 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u062b\u0645 \u0623\u0639\u062f \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629.','Could not load seats. Check your connection and reload the page.')}</p>
      : seats.length === 0 ? <p className="panel mt-6 rounded-xl p-5">{t('لم يتم إعداد تخطيط مقاعد لهذا الباص بعد.','This bus does not have a seat layout yet.')}</p>
      : <div className="mt-6"><BusSeatBookingForm tripId={trip.id} seats={seats} locale={en?'en':'ar'}/></div>}
  </section><PublicFooter/></main>;
}
