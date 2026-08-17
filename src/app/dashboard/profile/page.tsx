import { UserRound } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { createClient } from '@/lib/supabase/server';

export default async function ProfilePage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = user ? await db.from('profiles').select('full_name,email,phone').eq('id', user.id).maybeSingle() : { data: null };
  const rows = [['الاسم', profile?.full_name ?? user?.user_metadata.full_name ?? '—'], ['البريد الإلكتروني', profile?.email ?? user?.email ?? '—'], ['الهاتف', profile?.phone ?? '—']];
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">الحساب</p><h1 className="mt-1 text-2xl font-black">الملف الشخصي</h1></header><main className="p-5 lg:p-9"><section className="panel max-w-2xl rounded-2xl p-6"><span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-[var(--brand)] dark:bg-emerald-950/50"><UserRound size={26} /></span><h2 className="mt-5 text-xl font-black">بيانات الحساب</h2><dl className="mt-5 divide-y divide-[var(--line)]">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-5 py-4"><dt className="text-sm text-[var(--muted)]">{label}</dt><dd className="max-w-[65%] break-words text-left text-sm font-bold">{value}</dd></div>)}</dl></section></main></DashboardShell>;
}
