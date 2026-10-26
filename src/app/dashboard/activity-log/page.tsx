import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { ActivityLogManager } from '@/components/activity-log-manager';
import { createClient } from '@/lib/supabase/server';

export default async function ActivityLogPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: permission }] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    db.from('section_permissions').select('activity_logs_view').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profile?.role !== 'admin' && !permission?.activity_logs_view) {
    return <DashboardShell><main className="p-5 lg:p-8" dir="rtl"><section className="panel rounded-2xl p-6 text-right" role="alert">ليس لديك صلاحية الاطلاع على سجل التطبيق.</section></main></DashboardShell>;
  }

  return <DashboardShell>
    <header dir="rtl" className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-6 text-right lg:px-9">
      <p className="eyebrow">الإدارة والمتابعة</p>
      <h1 className="mt-1 text-2xl font-black">سجل التطبيق</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">تابع العمليات المسجلة في التطبيق، وراجع تفاصيلها ونتائجها وفق صلاحياتك.</p>
    </header>
    <ActivityLogManager />
  </DashboardShell>;
}
