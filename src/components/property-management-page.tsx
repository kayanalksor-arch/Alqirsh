import Link from 'next/link';
import { ArrowLeft, Building2, FileText, Home, Inbox, Settings2, Users, Wrench } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { createClient } from '@/lib/supabase/server';

type Module = {
  title: string;
  description: string;
  table: string;
  fields: readonly string[];
};

const labels: Record<string, string> = {
  full_name: 'الاسم', name: 'الاسم', phone: 'الهاتف', email: 'البريد الإلكتروني',
  unit_number: 'رقم الوحدة', status: 'الحالة', property_type: 'النوع', unit_type: 'نوع الوحدة',
  monthly_rent: 'الإيجار', amount: 'المبلغ', due_date: 'تاريخ الاستحقاق',
  start_date: 'تاريخ البداية', end_date: 'تاريخ النهاية', priority: 'الأولوية', description: 'الوصف',
};

const shortcuts = [
  ['/dashboard/property-management/owners', 'الملاك', Users],
  ['/dashboard/property-management/properties', 'العقارات', Building2],
  ['/dashboard/property-management/units', 'الوحدات', Home],
  ['/dashboard/property-management/tenants', 'المستأجرون', Users],
  ['/dashboard/property-management/contracts', 'العقود', FileText],
  ['/dashboard/property-management/payments', 'المدفوعات', FileText],
  ['/dashboard/property-management/maintenance', 'الصيانة', Wrench],
  ['/dashboard/property-management/reports', 'التقارير', FileText],
  ['/dashboard/property-management/settings', 'إعدادات الأملاك', Settings2],
] as const;

function value(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return new Intl.NumberFormat('ar-EG').format(value);
  return String(value);
}

export async function PropertyManagementOverview() {
  const db = await createClient();
  const tables = ['managed_properties', 'managed_units', 'lease_contracts', 'maintenance_requests'] as const;
  const result = await Promise.all(tables.map(async (table) => db.from(table).select('*', { count: 'exact', head: true })));
  const failed = result.some(({ error }) => error);
  const counts = result.map(({ count }) => count ?? 0);
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">إدارة الأملاك</p><h1 className="mt-1 text-2xl font-black">نظرة عامة على الأملاك</h1></header><main className="p-5 lg:p-9"><section className="rounded-3xl bg-[var(--brand-deep)] p-7 text-white"><p className="text-sm text-emerald-200">مساحة عمل داخلية</p><h2 className="mt-2 text-2xl font-black">إدارة العقارات والوحدات والعقود من مكان واحد</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">تعتمد جميع المؤشرات على بيانات Supabase الفعلية فقط.</p></section>{failed ? <section className="panel mt-6 rounded-2xl p-6"><h2 className="font-black">لم تتوفر بيانات إدارة الأملاك بعد</h2><p className="mt-2 text-sm text-[var(--muted)]">طبّق ترحيل قاعدة البيانات الجديد ثم تأكد من منح حساب المدير دور الإدارة لعرض البيانات بأمان.</p></section> : <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['العقارات', counts[0], Building2], ['الوحدات', counts[1], Home], ['العقود', counts[2], FileText], ['طلبات الصيانة', counts[3], Wrench]].map(([label, count, Icon]) => { const CardIcon = Icon as typeof Building2; return <article key={String(label)} className="panel rounded-2xl p-5"><CardIcon className="text-[var(--brand)]" size={22} /><strong className="mt-6 block text-4xl font-black">{count as number}</strong><p className="mt-2 text-sm text-[var(--muted)]">{String(label)}</p></article>; })}</section>}<section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shortcuts.map(([href, label, Icon]) => <Link key={href} href={href} className="panel flex min-h-24 items-center justify-between rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-emerald-300"><span className="flex items-center gap-3 font-bold"><Icon className="text-[var(--brand)]" size={20} />{label}</span><ArrowLeft className="text-[var(--muted)]" size={18} /></Link>)}</section></main></DashboardShell>;
}

export async function PropertyManagementList({ title, description, table, fields }: Module) {
  const db = await createClient();
  const { data, error } = await db.from(table).select('*').order('created_at', { ascending: false }).limit(24);
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><Link href="/dashboard/property-management" className="text-sm font-bold text-[var(--brand)]">إدارة الأملاك</Link><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-2 text-sm text-[var(--muted)]">{description}</p></header><main className="p-5 lg:p-9">{error ? <section className="panel rounded-2xl p-6"><h2 className="font-black">تعذر تحميل البيانات</h2><p className="mt-2 text-sm text-[var(--muted)]">تأكد من تطبيق ترحيل إدارة الأملاك ومن أن حسابك يملك صلاحية الوصول.</p></section> : !data?.length ? <section className="panel grid min-h-72 place-items-center rounded-2xl p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-[var(--brand)] dark:bg-emerald-950/50"><Inbox size={25} /></span><h2 className="mt-4 text-lg font-black">لا توجد سجلات حالياً</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p></div></section> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.map((row) => <article key={String(row.id)} className="panel rounded-2xl p-5">{fields.map((field) => <div key={field} className="flex items-start justify-between gap-4 border-b border-[var(--line)] py-3 last:border-0"><span className="text-xs text-[var(--muted)]">{labels[field] ?? field}</span><span className="max-w-[65%] break-words text-left text-sm font-semibold">{value(row[field])}</span></div>)}</article>)}</section>}</main></DashboardShell>;
}
