import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { BusFront, CalendarDays, ClipboardList, ReceiptText } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { createClient } from '@/lib/supabase/server';
import { createBusTrip, confirmBusBooking, rejectBusBooking, reviewBusReceipt } from '@/app/actions/bus';
import { BusCreateForm } from '@/components/bus-create-form';
import { BusImageManager } from '@/components/bus-image-manager';
import { formatBusCurrency, localizeBusValue } from '@/lib/bus-localization';

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardTripsPage({ searchParams }: PageProps<'/dashboard/trips'>) {
  const query = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const { data: permission } = await db.from('section_permissions').select('*').eq('user_id', user.id).maybeSingle();
  const admin = profile?.role === 'admin';
  const canFleet = admin || permission?.bus_fleet_manage;
  const canTrips = admin || permission?.bus_trips_manage;
  const canBookings = admin || permission?.bus_bookings_view || permission?.bus_bookings_manage;
  const canManageBookings = admin || permission?.bus_bookings_manage;
  const canReviewReceipts = admin || permission?.bus_receipts_review;
  const canScan = admin || permission?.bus_qr_scan;
  if (canScan && !(canFleet || canTrips || canBookings || canReviewReceipts)) redirect('/dashboard/trips/scan');
  if (!(canFleet || canTrips || canBookings || canReviewReceipts)) redirect('/dashboard');

  const [busesResult, tripsResult, bookingsResult, receiptsResult] = await Promise.all([
    canFleet || canTrips ? db.from('buses').select('id,name,bus_number,plate_number,bus_type,status,image_path').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    canTrips ? db.from('bus_trips').select('id,trip_code,bus_name,origin,destination,departure_at,price,capacity,status') : Promise.resolve({ data: [] }),
    canBookings ? db.from('bus_bookings').select('id,booking_code,customer_name,customer_phone,total_amount,payment_method,payment_status,status,created_at,bus_trips(origin,destination,departure_at,bus_name)').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    canReviewReceipts ? db.from('bus_payment_receipts').select('id,booking_id,storage_path,mime_type,file_size,transfer_reference,created_at,bus_bookings(booking_code,customer_name,total_amount)').eq('review_status', 'pending').order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
  ]);
  const buses = busesResult.data ?? [];
  const trips = tripsResult.data ?? [];
  const bookings = bookingsResult.data ?? [];
  const receipts = await Promise.all((receiptsResult.data ?? []).map(async (receipt) => ({ ...receipt, signedUrl: (await db.storage.from('bus-payment-receipts').createSignedUrl(receipt.storage_path, 300)).data?.signedUrl ?? null })));
  const cookieStore = await cookies();
  const en = cookieStore.get('alqirsh-language')?.value === 'en';
  const t = (ar: string, english: string) => en ? english : ar;
  const locale = en ? 'en' : 'ar';
  const sortedTrips = [...trips].sort((a,b)=>new Date(b.departure_at).getTime()-new Date(a.departure_at).getTime());
  async function acceptReceiptAction(formData: FormData) {
    'use server';
    try { await reviewBusReceipt(String(formData.get('receipt_id') ?? ''), true); }
    catch (error) { console.error('Bus receipt approval failed:', error); redirect('/dashboard/trips?action_error=receipt_approval'); }
  }
  async function rejectReceiptAction(formData: FormData) {
    'use server';
    try { await reviewBusReceipt(String(formData.get('receipt_id') ?? ''), false, 'Receipt rejected by reviewer'); }
    catch (error) { console.error('Bus receipt rejection failed:', error); redirect('/dashboard/trips?action_error=receipt_rejection'); }
  }
  async function confirmBookingAction(formData: FormData) {
    'use server';
    try { await confirmBusBooking(String(formData.get('booking_id') ?? '')); }
    catch (error) { console.error('Bus booking confirmation failed:', error); redirect('/dashboard/trips?action_error=booking_confirmation'); }
  }
  async function rejectBookingAction(formData: FormData) {
    'use server';
    try { await rejectBusBooking(String(formData.get('booking_id') ?? '')); }
    catch (error) { console.error('Bus booking rejection failed:', error); redirect('/dashboard/trips?action_error=booking_rejection'); }
  }

  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">{t('النقل والحجوزات','TRANSPORT & BOOKINGS')}</p><h1 className="mt-1 text-2xl font-black">{t('إدارة رحلات الباصات','Bus trips and bookings')}</h1><p className="mt-2 text-sm text-[var(--muted)]">{t('إدارة الأسطول والمواعيد ومتابعة طلبات الحجز ضمن صلاحيات حسابك.','Manage the fleet, schedules, and booking requests within your assigned permissions.')}</p></header>
    <main className="dashboard-content space-y-7">
      {typeof query.action_error === 'string' && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800">{t('\u062a\u0639\u0630\u0631 \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0639\u0645\u0644\u064a\u0629. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0633\u062c\u0644 \u062e\u0627\u062f\u0645 \u0627\u0644\u0631\u062d\u0644\u0627\u062a \u0648\u062a\u0623\u0643\u062f \u0645\u0646 \u062a\u0637\u0628\u064a\u0642 \u0622\u062e\u0631 \u062a\u0631\u062d\u064a\u0644 \u0644\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u062b\u0645 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.','The operation could not be completed. Check the trip server logs and make sure the latest database migration has been applied, then retry.')}</p>}
      {canFleet && <section className="panel rounded-2xl p-5"><h2 className="flex items-center gap-2 text-lg font-black"><BusFront size={20}/>{t('إضافة باص إلى الأسطول','Add a bus to the fleet')}</h2><p className="mt-2 text-sm text-[var(--muted)]">{t('ترفع صورة الباص إلى التخزين وتظهر في بطاقة الرحلة العامة.','Bus photos are uploaded to storage and shown on public trip cards.')}</p><BusCreateForm locale={en?'en':'ar'}/></section>}

      {canTrips && <section className="panel rounded-2xl p-5"><h2 className="flex items-center gap-2 text-lg font-black"><CalendarDays size={20}/>{t('إنشاء رحلة','Create a trip')}</h2><form action={createBusTrip} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>{t('الباص','Bus')}<select name="bus_id" required defaultValue=""><option value="" disabled>{t('اختر باصًا نشطًا','Choose an active bus')}</option>{buses.filter((bus) => bus.status === 'active').map((bus) => <option value={bus.id} key={bus.id}>{bus.name} · {bus.bus_number}</option>)}</select></label><label>{t('مدينة المغادرة','Origin city')}<input name="origin" required maxLength={120}/></label><label>{t('مدينة الوصول','Destination city')}<input name="destination" required maxLength={120}/></label><label>{t('سعر التذكرة بالجنيه','Ticket price (EGP)')}<input name="price" type="number" min="0" step="0.01" required/></label><label>{t('موعد المغادرة','Departure')}<input name="departure_at" type="datetime-local" required/></label><label>{t('موعد الوصول المتوقع','Estimated arrival')}<input name="arrival_at" type="datetime-local"/></label><label>{t('حالة النشر','Publishing status')}<select name="status"><option value="draft">{t('مسودة','Draft')}</option><option value="published">{t('منشورة','Published')}</option></select></label><button className="min-h-11 self-end rounded-xl bg-[var(--brand)] px-4 font-bold text-white">{t('حفظ الرحلة','Save trip')}</button>
      </form></section>}

      {canFleet && <section><h2 className="mb-3 text-lg font-black">{t('الأسطول','Fleet')} ({buses.length})</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{buses.map((bus)=><article key={bus.id} className="panel overflow-hidden rounded-2xl"><div className="p-4"><h3 className="font-black">{bus.name}</h3><p className="mt-1 text-sm text-[var(--muted)]">{bus.bus_number} · {bus.plate_number??'—'} · {localizeBusValue('bus',bus.bus_type,locale)}</p><p className="mt-1 text-xs">{localizeBusValue('bus',bus.status,locale)}</p><BusImageManager busId={bus.id} path={bus.image_path} locale={en?'en':'ar'}/></div></article>)}{!buses.length&&<p className="panel rounded-xl p-4 text-sm text-[var(--muted)]">{t('لا توجد باصات بعد.','No buses yet.')}</p>}</div></section>}

      {canTrips && <section><h2 className="mb-3 text-lg font-black">{t('الرحلات','Trips')} ({trips.length})</h2><div className="responsive-table panel rounded-2xl"><table><thead><tr><th>{t('رقم الرحلة','Trip')}</th><th>{t('المسار','Route')}</th><th>{t('الموعد','Departure')}</th><th>{t('المقاعد','Seats')}</th><th>{t('السعر','Price')}</th><th>{t('الحالة','Status')}</th></tr></thead><tbody>{sortedTrips.map((trip) => <tr key={trip.id}><td>{trip.trip_code ?? trip.id.slice(0,8)}</td><td>{trip.origin} → {trip.destination} · {trip.bus_name}</td><td>{new Intl.DateTimeFormat(en?'en-EG':'ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(trip.departure_at))}</td><td>{trip.capacity}</td><td>{formatBusCurrency(trip.price,locale)}</td><td>{localizeBusValue('trip',trip.status,locale)}</td></tr>)}{!trips.length && <tr><td colSpan={6}>{t('لا توجد رحلات بعد.','No trips yet.')}</td></tr>}</tbody></table></div></section>}

      {canScan && <Link href="/dashboard/trips/scan" className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand)] px-4 font-bold text-white">{t('فتح قارئ التذاكر','Open ticket scanner')}</Link>}
      {canReviewReceipts && <section><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><ReceiptText size={20}/>{t('إيصالات التحويل قيد المراجعة','Transfer receipts to review')} ({receipts.length})</h2><div className="grid gap-3 md:grid-cols-2">{receipts.map((receipt) => { const booking = Array.isArray(receipt.bus_bookings) ? receipt.bus_bookings[0] : receipt.bus_bookings; return <article key={receipt.id} className="panel rounded-2xl p-4"><p className="font-bold">{booking?.booking_code} · {booking?.customer_name}</p><p className="mt-1 text-sm text-[var(--muted)]">{booking?.total_amount != null ? formatBusCurrency(booking.total_amount,locale) : ''} · {receipt.transfer_reference ?? t('لا يوجد رقم مرجعي','No transfer reference')}</p><p className="mt-1 text-xs text-[var(--muted)]">{localizeBusValue('receipt',receipt.mime_type,locale)} · {Math.ceil(receipt.file_size/1024)} {t('\u0643\u064a\u0644\u0648\u0628\u0627\u064a\u062a','KB')}</p>{receipt.signedUrl&&<a href={receipt.signedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-bold text-[var(--brand)]">{t('فتح إيصال الدفع','Open payment receipt')}</a>}<div className="mt-4 flex gap-2"><form action={acceptReceiptAction}><input type="hidden" name="receipt_id" value={receipt.id}/><button className="min-h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-bold text-white">{t('تأكيد التحويل','Confirm transfer')}</button></form><form action={rejectReceiptAction}><input type="hidden" name="receipt_id" value={receipt.id}/><button className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-bold">{t('رفض الإيصال','Reject receipt')}</button></form></div></article>; })}{!receipts.length && <p className="panel rounded-xl p-4 text-sm text-[var(--muted)]">{t('لا توجد إيصالات تنتظر المراجعة.','No receipts are waiting for review.')}</p>}</div></section>}

      {canBookings && <section><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><ClipboardList size={20}/>{t('طلبات الحجز','Booking requests')} ({bookings.length})</h2><div className="grid gap-3">{bookings.map((booking) => { const trip = Array.isArray(booking.bus_trips) ? booking.bus_trips[0] : booking.bus_trips; return <article key={booking.id} className="panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"><div><p className="font-black">{booking.booking_code} · {booking.customer_name}</p><p className="mt-1 text-sm text-[var(--muted)]">{booking.customer_phone} · {trip?.origin} → {trip?.destination} · {formatBusCurrency(booking.total_amount,locale)}</p><p className="mt-1 text-xs text-[var(--muted)]">{localizeBusValue('paymentMethod',booking.payment_method,locale)} · {localizeBusValue('payment',booking.payment_status,locale)} · {localizeBusValue('booking',booking.status,locale)}</p></div>{canManageBookings && booking.status==='pending' && <div className="flex gap-2"><form action={confirmBookingAction}><input type="hidden" name="booking_id" value={booking.id}/><button className="min-h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-bold text-white">{t('قبول الحجز','Confirm booking')}</button></form><form action={rejectBookingAction}><input type="hidden" name="booking_id" value={booking.id}/><button className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-bold">{t('رفض وتحرير المقاعد','Reject and release seats')}</button></form></div>}</article>; })}{!bookings.length && <p className="panel rounded-xl p-4 text-sm text-[var(--muted)]">{t('لا توجد طلبات حجز بعد.','No booking requests yet.')}</p>}</div></section>}
    </main></DashboardShell>;
}
