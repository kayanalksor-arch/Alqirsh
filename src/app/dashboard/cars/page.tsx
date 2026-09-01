import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard-shell';
import { VehicleManager } from '@/components/vehicle-manager';

export default async function DashboardCarsPage() {
  const db = await createClient();

  // Fetch statistics
  const [totalCount, saleCount, rentCount, activeCount, inactiveCount] = await Promise.all([
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('listing_type', 'sale').then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('listing_type', 'rent').then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('status', 'active').then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('status', 'inactive').then(r => r.count ?? 0),
  ]);

  return (
    <DashboardShell>
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9">
        <p className="eyebrow">إدارة السيارات</p>
        <h1 className="mt-1 text-2xl font-black">السيارات</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">أضف السيارات وعدّلها وأدر إعلاناتها للبيع والإيجار.</p>
      </header>

      <main className="dashboard-content space-y-6">
        {/* Statistics Cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">إجمالي السيارات</p>
            <strong className="mt-3 block text-3xl font-black">{totalCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">للبيع</p>
            <strong className="mt-3 block text-3xl font-black">{saleCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">للإيجار</p>
            <strong className="mt-3 block text-3xl font-black">{rentCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">نشطة</p>
            <strong className="mt-3 block text-3xl font-black">{activeCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">غير نشطة</p>
            <strong className="mt-3 block text-3xl font-black">{inactiveCount}</strong>
          </article>
        </section>

        {/* Vehicle Manager */}
        <VehicleManager />
      </main>
    </DashboardShell>
  );
}
