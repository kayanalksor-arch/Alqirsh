import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/dashboard-shell';
import { BusTicketScanner } from '@/components/bus-ticket-scanner';
import { createClient } from '@/lib/supabase/server';

export const metadata = { robots: { index: false, follow: false, noarchive: true } };

export default async function BusTripScannerPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: permitted, error } = await db.rpc('has_section_permission', { permission_name: 'bus.qr.scan' });
  if (error || !permitted) redirect('/dashboard');
  const en = (await cookies()).get('alqirsh-language')?.value === 'en';
  const { data: trips } = await db.from('bus_trips').select('id,trip_code,bus_name,origin,destination,departure_at').eq('status','published').gt('departure_at',new Date().toISOString()).order('departure_at').limit(100);
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">{en?'TICKETS & BOARDING':'التذاكر والصعود'}</p><h1 className="mt-1 text-2xl font-black">{en?'Ticket scanner':'قارئ التذاكر'}</h1></header><main className="dashboard-content"><BusTicketScanner locale={en?'en':'ar'} trips={trips??[]}/></main></DashboardShell>;
}
