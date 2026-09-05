import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard-shell';
import { VehicleManager } from '@/components/vehicle-manager';

export default async function DashboardCarsPage() {
  const db = await createClient();

  // Fetch statistics
  const [totalCount, availableSaleCount, availableRentCount, soldCount, rentedCount, reservedCount, archivedCount] = await Promise.all([
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).match({ listing_type: 'sale', status: 'available' }).then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).match({ listing_type: 'rent', status: 'available' }).then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('status', 'sold').then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('status', 'rented').then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('status', 'reserved').then(r => r.count ?? 0),
    db.from('vehicle_listings').select('*', { count: 'exact', head: true }).eq('status', 'archived').then(r => r.count ?? 0),
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
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">إجمالي السيارات</p>
            <strong className="mt-3 block text-3xl font-black">{totalCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">متاحة للبيع</p>
            <strong className="mt-3 block text-3xl font-black">{availableSaleCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">متاحة للإيجار</p>
            <strong className="mt-3 block text-3xl font-black">{availableRentCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">تم البيع</p>
            <strong className="mt-3 block text-3xl font-black">{soldCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">تم التأجير</p>
            <strong className="mt-3 block text-3xl font-black">{rentedCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">محجوزة</p>
            <strong className="mt-3 block text-3xl font-black">{reservedCount}</strong>
          </article>
          <article className="panel rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">مؤرشفة</p>
            <strong className="mt-3 block text-3xl font-black">{archivedCount}</strong>
          </article>
        </section>

        {/* Vehicle Manager */}
        <VehicleManager />
      </main>
    </DashboardShell>
  );
}
