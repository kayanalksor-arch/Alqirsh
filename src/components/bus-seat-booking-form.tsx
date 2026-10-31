'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { createBusBooking } from '@/app/actions/bus';
import { createClient } from '@/lib/supabase/client';

type Seat = {
  seat_id: string;
  seat_label: string;
  seat_type: string;
  row_number: number;
  seat_position: number;
  is_available: boolean;
};

export function BusSeatBookingForm({ tripId, seats, locale }: { tripId: string; seats: Seat[]; locale: 'ar' | 'en' }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash_on_boarding' | ''>('');
  const [availability, setAvailability] = useState(() => new Map(seats.map((seat) => [seat.seat_id, seat.is_available])));
  const [state, formAction, pending] = useActionState(createBusBooking, { error: null });
  const en = locale === 'en';
  const labels = en ? {
    seats: 'Choose seats', passenger: 'Passenger name', name: 'Booking contact name', phone: 'Phone number',
    payment: 'Payment method', transfer: 'Bank or wallet transfer', cash: 'Cash on boarding', submit: 'Reserve seats',
    available: 'Available', unavailable: 'Unavailable', limit: 'Choose up to 8 seats. The seat hold lasts 10 minutes.',
    row: 'Row', front: 'Front of bus', aisle: 'Aisle', reserved: 'Reserved', selectedLabel: 'Selected', refresh: 'Seat availability refreshes every 12 seconds.',
  } : {
    seats: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0642\u0627\u0639\u062f', passenger: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u0627\u0641\u0631', name: '\u0627\u0633\u0645 \u0635\u0627\u062d\u0628 \u0627\u0644\u062d\u062c\u0632', phone: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641',
    payment: '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639', transfer: '\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a \u0623\u0648 \u0645\u062d\u0641\u0638\u0629', cash: '\u0646\u0642\u062f\u064b\u0627 \u0639\u0646\u062f \u0627\u0644\u0635\u0639\u0648\u062f', submit: '\u0627\u062d\u062c\u0632 \u0627\u0644\u0645\u0642\u0627\u0639\u062f',
    available: '\u0645\u062a\u0627\u062d', unavailable: '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d', limit: '\u0627\u062e\u062a\u0631 \u062d\u062a\u0649 8 \u0645\u0642\u0627\u0639\u062f. \u0645\u062f\u0629 \u0627\u0644\u062d\u062c\u0632 \u0627\u0644\u0645\u0624\u0642\u062a 10 \u062f\u0642\u0627\u0626\u0642.',
    row: '\u0635\u0641', front: '\u0645\u0642\u062f\u0645\u0629 \u0627\u0644\u0628\u0627\u0635', aisle: '\u0645\u0645\u0631', reserved: '\u0645\u062d\u062c\u0648\u0632', selectedLabel: '\u0645\u062d\u062f\u062f', refresh: '\u064a\u062a\u062d\u062f\u062b \u062a\u0648\u0641\u0631 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0643\u0644 12 \u062b\u0627\u0646\u064a\u0629.',
  };
  const paymentLabels = en
    ? { details: 'Transfer using Vodafone Cash or InstaPay', number: 'Transfer number', proof: 'Upload payment screenshot or receipt', help: 'JPG, PNG, WEBP, or PDF · up to 8 MB. Payment is reviewed before confirmation.', reference: 'Transfer reference (optional)' }
    : { details: '\u062d\u0648\u0651\u0644 \u0639\u0628\u0631 \u0641\u0648\u062f\u0627\u0641\u0648\u0646 \u0643\u0627\u0634 \u0623\u0648 \u0625\u0646\u0633\u062a\u0627\u0628\u0627\u064a', number: '\u0631\u0642\u0645 \u0627\u0644\u062a\u062d\u0648\u064a\u0644', proof: '\u0627\u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0627\u0644\u062f\u0641\u0639 \u0623\u0648 \u0625\u064a\u0635\u0627\u0644 \u0627\u0644\u062f\u0641\u0639', help: '\u0627\u0644\u0635\u064a\u063a: JPG \u0623\u0648 PNG \u0623\u0648 WEBP \u0623\u0648 PDF\u060c \u062d\u062a\u0649 8 \u0645\u064a\u062c\u0627\u0628\u0627\u064a\u062a. \u0633\u062a\u062a\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062f\u0641\u0639 \u0642\u0628\u0644 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632.', reference: '\u0645\u0631\u062c\u0639 \u0627\u0644\u062a\u062d\u0648\u064a\u0644 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)' };

  const selectedLabels = useMemo(() => selected.map((id) => seats.find((seat) => seat.seat_id === id)?.seat_label ?? id), [selected, seats]);
  const seatRows = useMemo(() => {
    const rows = new Map<number, Seat[]>();
    for (const seat of seats) rows.set(seat.row_number, [...(rows.get(seat.row_number) ?? []), seat]);
    return [...rows.entries()].sort(([a], [b]) => a - b).map(([row, rowSeats]) => ({ row, seats: rowSeats.sort((a, b) => a.seat_position - b.seat_position) }));
  }, [seats]);

  useEffect(() => {
    let active = true;
    let refreshing = false;
    const refreshSeats = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const client = createClient();
        const current = await client.rpc('get_public_trip_seat_layout', { p_trip_id: tripId });
        let data = current.data as Seat[] | null;
        if (current.error || !data) {
          const legacy = await client.rpc('get_public_trip_seats', { p_trip_id: tripId });
          if (legacy.error || !legacy.data) return;
          data = (legacy.data as Omit<Seat, 'row_number' | 'seat_position'>[]).map((seat, index) => {
            const match = /^(\d+)([a-z]+)$/iu.exec(seat.seat_label.trim());
            const positionFromLabel = match?.[2].toUpperCase().split('').reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
            return { ...seat, row_number: match ? Number(match[1]) : Math.floor(index / 4) + 1, seat_position: positionFromLabel || (index % 4) + 1 };
          });
        }
        if (!active) return;
        const latest = new Map<string, boolean>(data.map((seat) => [seat.seat_id, seat.is_available]));
        setAvailability(latest);
        setSelected((current) => current.filter((id) => latest.get(id) !== false));
      } finally {
        refreshing = false;
      }
    };
    const timer = window.setInterval(() => void refreshSeats(), 12_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshSeats(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [tripId]);

  return <form action={formAction} className="panel rounded-2xl p-5">
    <input type="hidden" name="trip_id" value={tripId}/>
    {state.error && <p role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{en ? 'We could not complete the booking. Check the selected seats and payment details, then try again.' : '\u062a\u0639\u0630\u0631 \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062d\u062c\u0632. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0648\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u062b\u0645 \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'}</p>}
    <h2 className="text-lg font-black">{labels.seats}</h2><p className="mt-1 text-sm text-[var(--muted)]">{labels.limit}</p>
    <p className="mt-1 text-xs text-[var(--muted)]">{labels.refresh}</p>
    <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--canvas)] p-3 sm:p-5">
      <div className="mx-auto max-w-md rounded-[2rem] border-2 border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
        <p className="mx-auto mb-4 w-fit rounded-full border border-[var(--line)] bg-[var(--canvas)] px-5 py-2 text-xs font-black text-[var(--muted)]">{labels.front}</p>
        <div className="grid gap-2" role="group" aria-label={labels.seats}>
          {seatRows.map(({ row, seats: rowSeats }) => {
            const leftPair = [1, 2].map((position) => rowSeats.find((seat) => seat.seat_position === position));
            const rightPair = [3, 4].map((position) => rowSeats.find((seat) => seat.seat_position === position));
            const renderSeat = (seat: Seat | undefined, position: number) => {
              if (!seat) return <span key={`empty-${row}-${position}`} aria-hidden="true" className="size-11 sm:size-12"/>;
              const isAvailable = availability.get(seat.seat_id) ?? seat.is_available;
              const checked = selected.includes(seat.seat_id);
              const disabled = !isAvailable || (!checked && selected.length >= 8);
              const className = `grid size-11 place-items-center rounded-lg border text-[10px] font-black transition sm:size-12 sm:text-xs ${checked ? 'border-[var(--brand)] bg-[var(--brand)] text-white ring-2 ring-[var(--brand)] ring-offset-2' : isAvailable ? 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--brand)]' : 'cursor-not-allowed border-red-300 bg-red-100 text-red-800 opacity-90'}`;
              return <label key={seat.seat_id} title={`${labels.row} ${row} · ${seat.seat_label} · ${isAvailable ? labels.available : labels.reserved}`} className={className}>
                <input className="sr-only" type="checkbox" name="seat_ids" value={seat.seat_id} disabled={disabled} checked={checked} onChange={(event) => setSelected((current) => event.target.checked ? [...current, seat.seat_id] : current.filter((id) => id !== seat.seat_id))}/>
                <span>{seat.seat_label}</span><span className="sr-only">{isAvailable ? labels.available : labels.reserved}</span>
              </label>;
            };
            return <div key={row} className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-2">
              <span className="text-[10px] font-bold text-[var(--muted)]">{row}</span>
              <div className="flex justify-end gap-1.5 sm:gap-2">{leftPair.map((seat, index) => renderSeat(seat, index + 1))}</div>
              <span className="border-x border-dashed border-[var(--line)] px-1 text-[8px] text-[var(--muted)] sm:px-2 sm:text-[9px]">{labels.aisle}</span>
              <div className="flex gap-1.5 sm:gap-2">{rightPair.map((seat, index) => renderSeat(seat, index + 3))}</div>
            </div>;
          })}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold"><span className="flex items-center gap-1.5"><i className="size-3 rounded border border-[var(--line)] bg-[var(--surface)]"/>{labels.available}</span><span className="flex items-center gap-1.5"><i className="size-3 rounded bg-[var(--brand)]"/>{labels.selectedLabel}</span><span className="flex items-center gap-1.5"><i className="size-3 rounded border border-red-300 bg-red-100"/>{labels.reserved}</span></div>
      </div>
    </div>
    {selectedLabels.map((seatLabel, index) => <label key={selected[index]} className="mt-4 block text-sm font-bold">{labels.passenger} · {seatLabel}<input name="passenger_names" required minLength={2} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 font-normal"/></label>)}
    <label className="mt-5 block text-sm font-bold">{labels.name}<input name="customer_name" required minLength={2} maxLength={120} autoComplete="name" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 font-normal"/></label>
    <label className="mt-4 block text-sm font-bold">{labels.phone}<input name="customer_phone" required type="tel" minLength={7} maxLength={30} autoComplete="tel" dir="ltr" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 text-left font-normal"/></label>
    <fieldset className="mt-5"><legend className="text-sm font-bold">{labels.payment}</legend><label className="mt-3 flex items-center gap-2 text-sm"><input type="radio" name="payment_method" value="bank_transfer" required checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')}/>{labels.transfer}</label><label className="mt-2 flex items-center gap-2 text-sm"><input type="radio" name="payment_method" value="cash_on_boarding" required checked={paymentMethod === 'cash_on_boarding'} onChange={() => setPaymentMethod('cash_on_boarding')}/>{labels.cash}</label></fieldset>
    {paymentMethod === 'bank_transfer' && <section className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-4" aria-live="polite"><h3 className="font-black">{paymentLabels.details}</h3><p className="mt-2 text-sm text-[var(--muted)]">{paymentLabels.number}</p><p dir="ltr" className="mt-1 text-2xl font-black tracking-wider text-[var(--brand)]">01090886364</p><label className="mt-4 block text-sm font-bold">{paymentLabels.proof}<input type="file" name="receipt" accept="image/jpeg,image/png,image/webp,application/pdf" required className="mt-2 block w-full rounded-lg border border-[var(--line)] p-2" /></label><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{paymentLabels.help}</p><label className="mt-3 block text-sm font-bold">{paymentLabels.reference}<input name="transfer_reference" maxLength={120} className="mt-2 min-h-10 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 font-normal" /></label></section>}
    <button disabled={!selected.length || pending} className="mt-6 min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? (en ? 'Submitting…' : '\u062c\u0627\u0631\u064d \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062d\u062c\u0632...') : labels.submit}</button>
  </form>;
}
