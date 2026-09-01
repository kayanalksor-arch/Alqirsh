import Link from 'next/link';
import { ArrowUpLeft, Building2, CarFront, ClipboardList, KeyRound, Users } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { createClient } from '@/lib/supabase/server';

const statistics = [
  ['sale_offers', 'عروض البيع', 'إجمالي عروض البيع المسجلة', Building2],
  ['rental_offers', 'عروض الإيجار', 'إجمالي عروض الإيجار المسجلة', KeyRound],
  ['vehicle_listings', 'السيارات', 'إجمالي السيارات المسجلة', CarFront],
  ['requests', 'الطلبات', 'طلبات العملاء المسجلة', ClipboardList],
  ['profiles', 'المستخدمون', 'ملفات المستخدمين', Users],
] as const;

export default async function DashboardPage() {
  const db = await createClient();
  const counts = await Promise.all(statistics.map(async ([table]) => (await db.from(table).select('*', { count: 'exact', head: true })).count ?? 0));
  const { data: latestSales } = await db.from('sale_offers').select('id,title,status,created_at').order('created_at', { ascending: false }).limit(3);
  const { data: latestVehicleListings } = await db.from('vehicle_listings').select('id,title,status,listing_type,created_at').order('created_at', { ascending: false }).limit(3);
  const { data: latestRequests } = await db.from('requests').select('id,customer_name,status,created_at').order('created_at', { ascending: false }).limit(3);
  const activity = [...(latestSales ?? []).map((item) => ({ id: `sale-${item.id}`, label: item.title, kind: 'عرض بيع', status: item.status })), ...(latestVehicleListings ?? []).map((item) => ({ id: `vehicle-${item.id}`, label: item.title, kind: item.listing_type === 'sale' ? 'سيارة للبيع' : 'سيارة للإيجار', status: item.status })), ...(latestRequests ?? []).map((item) => ({ id: `request-${item.id}`, label: item.customer_name, kind: 'طلب عميل', status: item.status ?? 'new' }))].slice(0, 6);
  return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">نظرة عامة</p><h1 className="mt-1 text-2xl font-black">لوحة التحكم</h1></header><main className="p-5 lg:p-9"><section className="rounded-3xl bg-[var(--brand-deep)] p-7 text-white lg:flex lg:items-center lg:justify-between"><div><p className="text-sm font-bold text-emerald-200">القِرش | إدارة العقارات</p><h2 className="mt-2 text-2xl font-black">مرحباً بك في مساحة العمل</h2><p className="mt-2 text-sm text-emerald-100">إليك نظرة سريعة على نشاط المنصة.</p></div><Link href="/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-emerald-950 lg:mt-0">عرض الموقع <ArrowUpLeft size={16}/></Link></section><section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statistics.map(([, label, description, Icon], index) => <article key={label} className="panel rounded-2xl p-5"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[var(--brand)] dark:bg-emerald-950/50"><Icon size={19}/></span><strong className="mt-6 block text-4xl font-black">{counts[index]}</strong><h2 className="mt-2 text-sm font-bold">{label}</h2><p className="mt-1 text-xs text-[var(--muted)]">{description}</p></article>)}</section><section className="panel mt-6 rounded-2xl p-6"><p className="eyebrow">آخر البيانات</p><h2 className="mt-1 text-xl font-black">متابعة العقارات والطلبات</h2>{activity.length ? <div className="mt-5 divide-y divide-[var(--line)]">{activity.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-bold">{item.label}</p><p className="mt-1 text-sm text-[var(--muted)]">{item.kind}</p></div><span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-bold text-[var(--muted)]">{item.status}</span></div>)}</div> : <p className="mt-4 text-sm leading-6 text-[var(--muted)]">لا توجد عروض أو طلبات حديثة. ستظهر النشاطات الحقيقية هنا فور إضافتها إلى قاعدة البيانات.</p>}</section></main></DashboardShell>;
}
