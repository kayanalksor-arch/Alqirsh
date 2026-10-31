import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BusFront, TicketCheck } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { createClient } from '@/lib/supabase/server';
import { uploadBusReceipt } from '@/app/actions/bus';
import { ETicket } from '@/components/e-ticket';
import { localizeBusService } from '@/lib/bus-services';
import { formatBusCurrency, localizeBusValue } from '@/lib/bus-localization';

type CustomerTicket = { ticket_id: string; passenger_name: string; seat_label: string; ticket_status: string; qr_token: string | null };

export const metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function CustomerBusBookingPage({ params, searchParams }: PageProps<'/trips/bookings/[bookingCode]'>) {
  const { bookingCode } = await params;
  const query = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/trips/bookings/${bookingCode}`)}`);
  const { data: booking } = await db.from('bus_bookings').select('id,booking_code,customer_name,customer_phone,total_amount,payment_method,payment_status,status,hold_expires_at,created_at,bus_trips(trip_code,bus_name,origin,destination,departure_at,arrival_at,services)').eq('booking_code', bookingCode).maybeSingle();
  if (!booking) notFound();
  const [{ data: seats }, { data: ticketRows, error: ticketQueryError }, { data: receipts }] = await Promise.all([
    db.from('bus_booking_seats').select('seat_label,passenger_name,status').eq('booking_id', booking.id).order('seat_label'),
    db.rpc('get_bus_customer_tickets', { p_booking_id: booking.id }),
    db.from('bus_payment_receipts').select('id,storage_path,mime_type,file_size,transfer_reference,review_status,created_at').eq('booking_id', booking.id).order('created_at', { ascending: false }),
  ]);
  let ticketRowsWithQr = (ticketRows ?? []) as CustomerTicket[];
  let ticketLoadFailed = Boolean(ticketQueryError);
  const ticketEligible = booking.status === 'confirmed' && (
    booking.payment_status === 'paid'
    || (booking.payment_method === 'cash_on_boarding' && booking.payment_status === 'cash_due')
  );
  if (ticketEligible && (ticketRowsWithQr.length === 0 || ticketRowsWithQr.some((ticket) => !ticket.qr_token))) {
    const { data: issuedRows, error: issueError } = await db.rpc('issue_bus_tickets', { p_booking_id: booking.id });
    if (issuedRows?.length) {
      ticketRowsWithQr = (issuedRows as { ticket_id: string; passenger_name: string; seat_label: string; ticket_status: string; qr_token: string | null }[]).map((ticket) => ({
        ticket_id: ticket.ticket_id,
        passenger_name: ticket.passenger_name,
        seat_label: ticket.seat_label,
        ticket_status: ticket.ticket_status,
        qr_token: ticket.qr_token,
      }));
      ticketLoadFailed = false;
    } else if (issueError) ticketLoadFailed = true;
  }
  const tickets = ticketRowsWithQr;
  const ticketQrMissing = tickets.some((ticket) => !ticket.qr_token);
  const en = (await cookies()).get('alqirsh-language')?.value === 'en';
  const locale = en ? 'en' : 'ar';
  const t = (ar: string, english: string) => en ? english : ar;
  const trip = Array.isArray(booking.bus_trips) ? booking.bus_trips[0] : booking.bus_trips;
  const signedReceipts = await Promise.all((receipts ?? []).map(async (receipt) => ({ ...receipt, url: (await db.storage.from('bus-payment-receipts').createSignedUrl(receipt.storage_path, 300)).data?.signedUrl ?? null })));
  return <main className="app-shell min-h-screen"><PublicHeader/><section className="page-container max-w-4xl">
    <p className="eyebrow">{t('تفاصيل الحجز','BOOKING DETAILS')}</p><h1 className="mt-2 text-3xl font-black">{booking.booking_code}</h1>
    {query.receipt === 'failed' && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800">{t('\u062a\u0639\u0630\u0631 \u0631\u0641\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627. \u0623\u0639\u062f \u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0645\u0646 \u0627\u0644\u0646\u0645\u0648\u0630\u062c \u0623\u062f\u0646\u0627\u0647.','The receipt could not be uploaded automatically. Please upload it again below.')}</p>}
    <article className="panel mt-5 rounded-2xl p-5"><div className="flex items-center gap-3"><BusFront className="text-[var(--brand)]"/><div><h2 className="font-black">{trip?.origin} → {trip?.destination}</h2><p className="mt-1 text-sm text-[var(--muted)]">{trip?.bus_name} · {trip?.trip_code}</p></div></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p>{t('موعد المغادرة','Departure')}: {trip?.departure_at ? new Intl.DateTimeFormat(en?'en-EG':'ar-EG',{dateStyle:'full',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(trip.departure_at)) : '—'}</p><p>{t('الإجمالي','Total')}: {formatBusCurrency(booking.total_amount, locale)}</p><p>{t('حالة الحجز','Booking status')}: {localizeBusValue('booking', booking.status, locale)}</p><p>{t('حالة الدفع','Payment status')}: {localizeBusValue('payment', booking.payment_status, locale)}</p><p>{t('طريقة الدفع','Payment method')}: {localizeBusValue('paymentMethod', booking.payment_method, locale)}</p><p>{t('المقاعد','Seats')}: {(seats??[]).map((seat)=>seat.seat_label).join(', ')}</p></div>{booking.payment_method==='cash_on_boarding'&&booking.payment_status==='cash_due'&&<p className="mt-4 rounded-xl bg-orange-100 p-3 text-sm font-bold text-orange-700">{t('المبلغ مستحق عند الصعود.','Payment is due when boarding.')}</p>}{booking.status==='pending'&&new Date(booking.hold_expires_at)>new Date()&&<p className="mt-4 text-sm text-[var(--muted)]">{t('المقاعد محتجزة مؤقتًا حتى','Seats are held until')} {new Intl.DateTimeFormat(en?'en-EG':'ar-EG',{timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(booking.hold_expires_at))}</p>}</article>
    {booking.payment_method==='bank_transfer'&&['awaiting_receipt','rejected'].includes(booking.payment_status)&&booking.status==='pending'&&<form action={uploadBusReceipt} className="panel mt-5 grid gap-3 rounded-2xl p-5"><input type="hidden" name="booking_id" value={booking.id}/><input type="hidden" name="booking_code" value={booking.booking_code}/><h2 className="font-black">{t('رفع إيصال التحويل للمراجعة','Upload a transfer receipt for review')}</h2><p className="text-sm text-[var(--muted)]">{t('\u062d\u0648\u0651\u0644 \u0639\u0628\u0631 \u0641\u0648\u062f\u0627\u0641\u0648\u0646 \u0643\u0627\u0634 \u0623\u0648 \u0625\u0646\u0633\u062a\u0627\u0628\u0627\u064a \u0625\u0644\u0649 01090886364. \u0631\u0641\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u0644\u0627 \u064a\u0624\u0643\u062f \u0627\u0644\u062f\u0641\u0639\u061b \u0633\u062a\u0631\u0627\u062c\u0639\u0647 \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0642\u0628\u0644 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632.','Transfer using Vodafone Cash or InstaPay to 01090886364. Uploading a receipt does not confirm payment; it will be reviewed before the booking is confirmed.')}</p><label className="text-sm font-bold">{t('ملف الإيصال','Receipt file')}<input type="file" name="receipt" accept="image/jpeg,image/png,image/webp,application/pdf" required className="mt-2 block w-full"/></label><label className="text-sm font-bold">{t('رقم التحويل','Transfer reference')}<input name="transfer_reference" maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 font-normal"/></label><button className="min-h-11 rounded-xl bg-[var(--brand)] px-4 font-bold text-white">{t('إرسال الإيصال','Submit receipt')}</button></form>}
    {booking.payment_method==='bank_transfer'&&['receipt_submitted','under_review'].includes(booking.payment_status)&&booking.status==='pending'&&<p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">{t('\u062a\u0645 \u0627\u0633\u062a\u0644\u0627\u0645 \u0625\u064a\u0635\u0627\u0644 \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0648\u0647\u0648 \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629.','Your transfer receipt was received and is being reviewed.')}</p>}
    {!!trip?.services?.length&&<section className="panel mt-5 rounded-2xl p-5"><h2 className="font-black">{t('\u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0645\u062a\u0648\u0641\u0631\u0629 \u0641\u064a \u0627\u0644\u0628\u0627\u0635','Bus services')}</h2><div className="mt-3 flex flex-wrap gap-2">{trip.services.map((service:string)=><span key={service} className="rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">{localizeBusService(service,en?'en':'ar')}</span>)}</div></section>}
    {!!signedReceipts.length&&<section className="panel mt-5 rounded-2xl p-5"><h2 className="font-black">{t('إيصالات الدفع','Payment receipts')}</h2><div className="mt-3 grid gap-2">{signedReceipts.map((receipt)=><p key={receipt.id} className="flex flex-wrap items-center gap-3 text-sm">{localizeBusValue('receipt', receipt.mime_type, locale)} · {Math.ceil(receipt.file_size/1024)} KB · {localizeBusValue('receipt', receipt.review_status, locale)}{receipt.url&&<a href={receipt.url} target="_blank" rel="noreferrer" className="font-bold text-[var(--brand)]">{t('فتح الملف','Open file')}</a>}</p>)}</div></section>}
    {ticketEligible&&(!tickets.length||ticketQrMissing)&&<p role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">{ticketLoadFailed ? t('\u062a\u0639\u0630\u0631 \u0625\u0635\u062f\u0627\u0631 \u0631\u0645\u0632 QR. \u0637\u0628\u0651\u0642 \u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b \u0644\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u062b\u0645 \u0623\u0639\u062f \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629.','Could not generate the QR ticket. Apply the latest database migration, then reload this page.') : t('\u0627\u0644\u062d\u062c\u0632 \u0645\u0624\u0643\u062f \u0648\u0644\u0643\u0646 \u0644\u0645 \u064a\u0645\u0643\u0646 \u0625\u0635\u062f\u0627\u0631 \u0631\u0645\u0632 QR. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062f\u0627\u0631\u0629.','The booking is confirmed, but its QR ticket could not be issued. Contact trip support.')}</p>}
    {!!tickets.length&&<section className="mt-5"><h2 className="mb-3 flex items-center gap-2 text-xl font-black"><TicketCheck/>{t('تذاكرك الإلكترونية','Your e-tickets')}</h2><div className="grid gap-3 sm:grid-cols-2">{tickets.map((ticket)=><ETicket key={ticket.ticket_id} bookingCode={booking.booking_code} passenger={ticket.passenger_name} seat={ticket.seat_label} token={ticket.qr_token} status={localizeBusValue('ticket', ticket.ticket_status, locale)} paymentStatus={booking.payment_status} route={`${trip?.origin ?? ''} → ${trip?.destination ?? ''}`} departure={trip?.departure_at ? new Intl.DateTimeFormat(en?'en-EG':'ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(trip.departure_at)) : ''} locale={en?'en':'ar'}/>)}</div></section>}    <Link href="/trips" className="mt-6 inline-flex font-bold text-[var(--brand)]">{t('العودة إلى الرحلات','Back to trips')}</Link>
  </section><PublicFooter/></main>;
}
