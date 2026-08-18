import { DashboardShell } from '@/components/dashboard-shell';
import { PartnersManager } from '@/components/partners-manager';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function PartnersPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = user ? await db.from('profiles').select('role').eq('id', user.id).single() : { data: null };

  if (!user || profile?.role !== 'admin') {
    return (
      <DashboardShell>
        <main className="p-9">
          <section className="panel rounded-2xl p-6">هذه الصفحة متاحة لمدير النظام فقط.</section>
        </main>
      </DashboardShell>
    );
  }

  const { data, error } = await createAdminClient().from('partners').select('*').order('created_at', { ascending: false });

  return (
    <DashboardShell>
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9">
        <p className="eyebrow">الشركات والعلاقات</p>
        <h1 className="mt-1 text-2xl font-black">شركاء النجاح</h1>
      </header>
      {error ? (
        <main className="p-9">تعذر تحميل الشركاء: {error.message}</main>
      ) : (
        <PartnersManager partners={data ?? []} />
      )}
    </DashboardShell>
  );
}
