import { DashboardShell } from '@/components/dashboard-shell';
import { UsersManager } from '@/components/users-manager';
import { createClient } from '@/lib/supabase/server';

export default async function UsersPage() {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError) console.error('[dashboard/users] Authentication check failed:', authError);
  if (!user) return <DashboardShell><main className="p-9"><section className="panel rounded-2xl p-6">يرجى تسجيل الدخول لعرض المستخدمين.</section></main></DashboardShell>;

  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError) console.error('[dashboard/users] Profile lookup failed:', profileError);
  if (profile?.role !== 'admin') return <DashboardShell><main className="p-9"><section className="panel rounded-2xl p-6">هذه الصفحة متاحة لمدير النظام فقط.</section></main></DashboardShell>;

  const { data, error } = await db.from('profiles').select('id,full_name,email,role,status,created_at').order('created_at', { ascending: false });
  if (error) console.error('[dashboard/users] User list query failed:', error);
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">إدارة الحسابات</p><h1 className="mt-1 text-2xl font-black">المستخدمون</h1></header>{error ? <main className="p-5 lg:p-9"><section role="alert" className="panel rounded-2xl border border-red-300 p-6"><h2 className="font-black">تعذر تحميل المستخدمين</h2><p className="mt-2 text-sm text-[var(--muted)]">لم نتمكن من قراءة بيانات الحسابات. تحقق من اتصال قاعدة البيانات أو أعد المحاولة.</p></section></main> : <UsersManager users={data ?? []} />}</DashboardShell>;
}
