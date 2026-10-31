'use client';

export function TicketPrintButton({ locale }: { locale: 'ar' | 'en' }) {
  return <button type="button" onClick={() => window.print()} className="no-print mt-4 min-h-10 rounded-xl border border-[var(--line)] px-4 text-sm font-bold">{locale === 'en' ? 'Print / Save as PDF' : 'طباعة / حفظ كملف PDF'}</button>;
}
