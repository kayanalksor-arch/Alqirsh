import Image from 'next/image';
import QRCode from 'qrcode';
import { TicketPrintButton } from '@/components/ticket-print-button';

export async function ETicket({ bookingCode, passenger, seat, token, status, route, departure, locale, paymentStatus }: {
  bookingCode: string; passenger: string; seat: string; token: string | null; status: string;
  route: string; departure: string; locale: 'ar' | 'en'; paymentStatus?: string;
}) {
  const qrImage = token ? await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', margin: 2, width: 320 }) : null;
  const en = locale === 'en';
  return <article className="print-ticket panel rounded-2xl p-5">
    <p className="font-black">{passenger} · {seat}</p>
    <p className="mt-2 text-sm text-[var(--muted)]">{en ? 'Ticket status' : 'حالة التذكرة'}: {status} · {bookingCode}</p>
    <p className="mt-1 text-sm">{route} · {departure}</p>
    {paymentStatus === 'cash_due' && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm font-bold text-amber-900">{en ? 'Payment is due when boarding. Boarding is allowed only after the employee records payment.' : 'المبلغ مستحق عند الصعود. لا يسمح بالصعود قبل تسجيل الموظف للتحصيل.'}</p>}
    <section aria-label={en ? 'Boarding QR code' : 'رمز الصعود QR'} className="mt-4 grid place-items-center rounded-xl border-2 border-[var(--brand)] bg-white p-4">
      <h3 className="mb-2 text-sm font-black text-[var(--ink)]">{en ? 'Show this QR code when boarding' : 'أظهر رمز QR هذا عند الصعود'}</h3>
      {qrImage
        ? <Image src={qrImage} alt={en ? 'Ticket QR code' : 'رمز QR للتذكرة'} width={280} height={280} unoptimized className="h-auto w-full max-w-[280px]" />
        : <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-sm font-bold text-red-800">{en ? 'QR code is unavailable. Do not use this ticket to board; contact trip support.' : 'رمز QR غير متاح. لا تستخدم هذه التذكرة للصعود، وتواصل مع دعم الرحلات.'}</p>}
      {token && <code className="mt-2 block break-all text-center text-[10px] text-[var(--muted)]">{token}</code>}
    </section>
    <TicketPrintButton locale={locale}/>
  </article>;
}
