import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { TicketCheck } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { createClient } from '@/lib/supabase/server';
import { formatBusCurrency, localizeBusValue } from '@/lib/bus-localization';

export const metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function MyBusBookingsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/trips/bookings')}`);
  const { data: bookings, error } = await db.from('bus_bookings').select('id,booking_code,total_amount,payment_method,payment_status,status,created_at,bus_trips(origin,destination,departure_at,bus_name)').order('created_at', { ascending: false }).limit(100);
  const en = (await cookies()).get('alqirsh-language')?.value === 'en';
  const t = (ar: string, english: string) => en ? english : ar;
  const locale = en ? 'en' : 'ar';
  return <main className="app-shell min-h-screen"><PublicHeader/><section className="page-container max-w-5xl"><p className="eyebrow">{t('حساب العميل','CUSTOMER ACCOUNT')}</p><h1 className="mt-2 text-3xl font-black">{t('رحلاتي وحجوزاتي','My trip bookings')}</h1>
    {error ? <p role="alert" className="panel mt-5 rounded-xl p-4">{t('تعذر تحميل الحجوزات.','Could not load bookings.')}</p> : bookings?.length ? <div className="mt-5 grid gap-3">{bookings.map((booking)=>{const trip=Array.isArray(booking.bus_trips)?booking.bus_trips[0]:booking.bus_trips;return <article key={booking.id} className="panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"><div><p className="font-black">{booking.booking_code} · {trip?.origin} → {trip?.destination}</p><p className="mt-1 text-sm text-[var(--muted)]">{trip?.bus_name} · {trip?.departure_at?new Intl.DateTimeFormat(en?'en-EG':'ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(trip.departure_at)):''}</p><p className="mt-1 text-xs text-[var(--muted)]">{localizeBusValue('booking',booking.status,locale)} · {localizeBusValue('payment',booking.payment_status,locale)} · {formatBusCurrency(booking.total_amount,locale)}</p></div><Link href={`/trips/bookings/${booking.booking_code}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold"><TicketCheck size={17}/>{t('عرض الحجز والتذاكر','View booking and tickets')}</Link></article>;})}</div> : <div className="panel mt-5 rounded-2xl p-8 text-center"><h2 className="font-black">{t('لا توجد حجوزات بعد','No bookings yet')}</h2><Link href="/trips" className="mt-4 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2 font-bold text-white">{t('استعرض الرحلات','Browse trips')}</Link></div>}
  </section><PublicFooter/></main>;
}
