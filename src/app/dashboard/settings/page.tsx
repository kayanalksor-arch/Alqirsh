import { DashboardShell } from '@/components/dashboard-shell';
import { SettingsForm } from '@/components/settings-form';
export default function SettingsPage() { return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">إدارة المنصة</p><h1 className="mt-1 text-2xl font-black">الإعدادات</h1><p className="mt-2 text-sm text-[var(--muted)]">تعديل بيانات الشركة والتواصل التي تُحفظ في قاعدة البيانات.</p></header><SettingsForm /></DashboardShell>; }
