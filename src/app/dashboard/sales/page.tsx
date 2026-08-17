import { DashboardShell } from '@/components/dashboard-shell';
import { OfferManager } from '@/components/offer-manager';

export default function SalesManagementPage() {
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">إدارة العروض</p><h1 className="mt-1 text-2xl font-black">عروض البيع</h1><p className="mt-2 text-sm text-[var(--muted)]">أضف العروض وعدّلها وانشر النشط منها في الموقع العام.</p></header><OfferManager kind="sale" /></DashboardShell>;
}
