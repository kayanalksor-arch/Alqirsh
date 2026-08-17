import { DashboardShell } from '@/components/dashboard-shell';
import { RequestManager } from '@/components/request-manager';
export default function RequestsPage() { return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">إدارة العملاء</p><h1 className="mt-1 text-2xl font-black">الطلبات</h1><p className="mt-2 text-sm text-[var(--muted)]">تابع طلبات العملاء وحدّث حالتها من مصدر البيانات الفعلي.</p></header><RequestManager /></DashboardShell>; }
