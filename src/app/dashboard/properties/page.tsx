import { DashboardShell } from '@/components/dashboard-shell';
import { PropertyManager } from '@/components/property-manager';

export default function PropertiesManagementPage() {
  return (
    <DashboardShell>
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9">
        <p className="eyebrow">إدارة المنصة</p>
        <h1 className="mt-1 text-2xl font-black">إدارة العقارات</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          أضف العقارات المعروضة للبيع والإيجار، عدّلها، وانشر النشط منها في الموقع العام.
        </p>
      </header>
      <PropertyManager />
    </DashboardShell>
  );
}
