'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, ShieldAlert, X } from 'lucide-react';
import { getActivityLogs, type ActivityFilters } from '@/app/actions/vehicles';

type Result = Awaited<ReturnType<typeof getActivityLogs>>;
type ActivityRow = Result['rows'][number];

const formatNumber = (value: number) => value.toLocaleString('ar-EG');
const sectionLabels: Record<string, string> = {
  users: 'المستخدمون', permissions: 'الصلاحيات', properties: 'العقارات',
  'properties.sale': 'عقارات البيع', 'properties.rent': 'عقارات الإيجار',
  'properties.management': 'إدارة الأملاك', cars: 'السيارات', bookings: 'الحجوزات', settings: 'الإعدادات',
  requests: 'طلبات العملاء', activity_logs: 'سجل التطبيق',
};
const actionLabels: Record<string, string> = {
  create: 'إضافة', user_created: 'إضافة مستخدم', update: 'تعديل', user_updated: 'تعديل مستخدم',
  delete: 'حذف', user_deleted: 'حذف مستخدم', archive: 'أرشفة', deactivate: 'تعطيل', activate: 'تفعيل',
  cancel: 'إلغاء', status_change: 'تغيير الحالة', permission_update: 'تعديل الصلاحيات',
  image_add: 'إضافة صورة', image_update: 'تعديل صورة', image_delete: 'حذف صورة',
  status: 'تغيير الحالة', login: 'تسجيل الدخول', logout: 'تسجيل الخروج',
};
const sectionOptions = ['users', 'permissions', 'properties', 'properties.sale', 'properties.rent', 'properties.management', 'cars', 'bookings', 'requests', 'settings'];
const outcomeLabels: Record<string, string> = { success: 'ناجحة', failure: 'فاشلة', denied: 'مرفوضة' };
const detailLabels: Record<string, string> = {
  status: 'الحالة', role_changed: 'تغيّر الدور', status_changed: 'تغيّرت حالة الحساب',
};
const statusLabels: Record<string, string> = {
  new: 'جديد', pending: 'قيد الانتظار', pending_review: 'قيد المراجعة', in_progress: 'قيد التنفيذ',
  completed: 'مكتمل', cancelled: 'ملغى', active: 'نشط', inactive: 'غير نشط',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير متاح';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(date);
}

function translatedDescription(row: ActivityRow) {
  const original = row.description?.trim() ?? '';
  if (/[\u0600-\u06FF]/.test(original)) return original;

  if (row.section === 'users') {
    if (row.action === 'create' || original === 'User created') return 'تم إنشاء المستخدم وإضافته إلى النظام.';
    if (row.action === 'update' || original.includes('role or status')) return 'تم تعديل بيانات المستخدم أو دوره أو حالة حسابه.';
    if (row.action === 'delete') return 'تم حذف حساب المستخدم.';
    if (row.action === 'deactivate') return 'تم إيقاف حساب المستخدم.';
  }
  if (row.section === 'permissions' || original.includes('permissions changed')) return 'تم تحديث صلاحيات المستخدم.';
  if (row.section === 'settings' || original.includes('Platform settings')) return 'تم تعديل إعدادات المنصة.';
  if (row.section === 'bookings' || original.startsWith('Booking ')) {
    const operation = row.action === 'create' ? 'إنشاء حجز' : row.action === 'cancel' ? 'إلغاء حجز' : 'تعديل حجز';
    return `تم ${operation} سيارة.`;
  }
  if (row.section === 'cars' || original.startsWith('Vehicle ') || original.includes('Listing media')) {
    const operation = actionLabels[row.action] ?? 'تعديل';
    return `تم ${operation} بيانات السيارة${original.includes('media') ? ' أو صورها' : ''}.`;
  }
  if (row.section.startsWith('properties') || original.startsWith('Property listing') || original.includes('Internal property management')) {
    const section = sectionLabels[row.section] ?? 'العقار';
    const operation = actionLabels[row.action] ?? (row.action === 'status' ? 'تغيير الحالة' : 'تعديل');
    return `تم ${operation} في قسم ${section}.`;
  }
  if (original) return 'تم تسجيل حدث في النظام.';
  return `تم تسجيل ${actionLabels[row.action] ?? 'عملية'} في قسم ${sectionLabels[row.section] ?? 'آخر'}.`;
}

function recordDetails(row: ActivityRow) {
  const pairs: [string, unknown][] = [
    ['المستخدم المنفّذ', row.actor_name], ['البريد الإلكتروني', row.actor_email],
    ['العملية', actionLabels[row.action] ?? 'حدث في النظام'], ['القسم', sectionLabels[row.section] ?? 'قسم آخر'],
    ['العنصر', row.entity_label || row.entity_id], ['وقت التنفيذ', formatDate(row.created_at)],
    ['النتيجة', outcomeLabels[row.outcome] ?? 'غير متاحة'], ['الوصف المسجل', translatedDescription(row)],
    ['معرّف المستخدم', row.actor_id], ['معرّف العنصر', row.entity_id],
  ];
  return pairs.filter(([, value]) => value !== null && value !== undefined && value !== '');
}

function detailValue(key: string, value: unknown) {
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (value === null || value === undefined || value === '') return 'غير متاح';
  if (key === 'status' && typeof value === 'string') return statusLabels[value] ?? 'حالة أخرى';
  return String(value);
}

export function ActivityLogManager() {
  const [filters, setFilters] = useState<ActivityFilters>({ page: 1 });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActivityRow | null>(null);

  useEffect(() => {
    let live = true;
    getActivityLogs(filters)
      .then(data => { if (live) { setResult(data); setError(''); } })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'تعذر تحميل سجل النشاط. حاول مرة أخرى.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [filters]);

  function updateFilter(key: keyof ActivityFilters, value: string | boolean | number) {
    setLoading(true);
    setFilters(current => ({ ...current, [key]: value, page: key === 'page' ? Number(value) : 1 }));
  }

  function setQuickRange(days?: number) {
    const start = days === undefined ? undefined : new Date();
    if (start) {
      start.setDate(start.getDate() - (days ?? 0));
      if (days === 0) start.setHours(0, 0, 0, 0);
    }
    setLoading(true);
    setFilters(current => ({ ...current, since: start?.toISOString(), until: undefined, page: 1 }));
  }

  const summary = result?.summary;
  const stats = [
    { label: 'إجمالي الأحداث', value: summary?.total, icon: Clock3, tone: 'text-sky-700 bg-sky-50 dark:text-sky-200 dark:bg-sky-950/40' },
    { label: 'عمليات ناجحة', value: summary?.success, icon: ChevronRight, tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/40' },
    { label: 'فاشلة أو مرفوضة', value: summary?.failed, icon: ShieldAlert, tone: 'text-rose-700 bg-rose-50 dark:text-rose-200 dark:bg-rose-950/40' },
    { label: 'مستخدمون نشطون', value: summary?.users, icon: Search, tone: 'text-violet-700 bg-violet-50 dark:text-violet-200 dark:bg-violet-950/40' },
    { label: 'عمليات حساسة', value: summary?.sensitive, icon: ShieldAlert, tone: 'text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/40' },
  ];

  return <main className="dashboard-content space-y-5 pb-8" dir="rtl">
    <section aria-label="ملخص سجل النشاط" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map(({ label, value, icon: Icon, tone }) => <article key={label} className="panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2"><p className="text-xs leading-5 text-[var(--muted)]">{label}</p><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={17} aria-hidden="true" /></span></div>
        <strong className="mt-3 block text-2xl font-black">{value === undefined ? '—' : formatNumber(Number(value))}</strong>
      </article>)}
    </section>

    <section aria-label="تصفية سجل النشاط" className="panel grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="relative block"><span className="sr-only">البحث في السجل</span><Search size={17} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={filters.search ?? ''} onChange={event => updateFilter('search', event.target.value)} placeholder="ابحث بالاسم أو البريد أو المعرّف" className="w-full rounded-xl border border-[var(--line)] bg-transparent py-3 pe-10 ps-3 text-sm outline-none focus:border-[var(--brand)]" /></label>
      <label><span className="sr-only">تصفية حسب القسم</span><select value={filters.section ?? ''} onChange={event => updateFilter('section', event.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm"><option value="">كل الأقسام</option>{sectionOptions.map(section => <option key={section} value={section}>{sectionLabels[section]}</option>)}</select></label>
      <label><span className="sr-only">تصفية حسب النتيجة</span><select value={filters.outcome ?? ''} onChange={event => updateFilter('outcome', event.target.value)} className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm"><option value="">كل النتائج</option><option value="success">ناجحة</option><option value="failure">فاشلة</option><option value="denied">مرفوضة</option></select></label>
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] p-3 text-sm"><input type="checkbox" checked={filters.sensitive === true} onChange={event => updateFilter('sensitive', event.target.checked)} className="size-4 accent-[var(--brand)]" />العمليات الحساسة فقط</label>
      <label className="text-xs text-[var(--muted)]">من تاريخ<input aria-label="من تاريخ" type="date" value={filters.since?.slice(0, 10) ?? ''} onChange={event => updateFilter('since', event.target.value ? new Date(`${event.target.value}T00:00:00+02:00`).toISOString() : '')} className="mt-1 block w-full rounded-lg border border-[var(--line)] bg-transparent p-2.5 text-sm text-[var(--text)]" /></label>
      <label className="text-xs text-[var(--muted)]">إلى تاريخ<input aria-label="إلى تاريخ" type="date" value={filters.until?.slice(0, 10) ?? ''} onChange={event => updateFilter('until', event.target.value ? new Date(`${event.target.value}T23:59:59+02:00`).toISOString() : '')} className="mt-1 block w-full rounded-lg border border-[var(--line)] bg-transparent p-2.5 text-sm text-[var(--text)]" /></label>
    </section>

    <div className="flex flex-wrap items-center gap-2" aria-label="فترات زمنية سريعة">
      <span className="inline-flex items-center gap-1.5 px-1 text-xs text-[var(--muted)]"><CalendarDays size={15} />فترة سريعة:</span>
      <button type="button" onClick={() => setQuickRange(0)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:bg-[var(--canvas)]">اليوم</button>
      <button type="button" onClick={() => setQuickRange(7)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:bg-[var(--canvas)]">آخر ٧ أيام</button>
      <button type="button" onClick={() => setQuickRange(30)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:bg-[var(--canvas)]">آخر ٣٠ يومًا</button>
      <button type="button" onClick={() => setQuickRange()} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:bg-[var(--canvas)]">كل الفترات</button>
    </div>

    {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

    <section className="panel overflow-hidden rounded-2xl" aria-label="أحداث سجل النشاط">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <div><h2 className="font-black">الأحداث المسجلة</h2><p className="mt-1 text-xs text-[var(--muted)]">تعرض الصفحة {formatNumber(result?.rows.length ?? 0)} حدثًا من أصل {formatNumber(result?.total ?? 0)}.</p></div>
        <span className="rounded-full bg-[var(--canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">الأحدث أولًا</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-right text-sm">
          <thead><tr className="border-b border-[var(--line)] bg-[var(--canvas)]/60 text-xs text-[var(--muted)]">{['التاريخ والوقت', 'المستخدم', 'القسم', 'العملية', 'العنصر', 'الوصف', 'النتيجة', ''].map((label, index) => <th key={`${label}-${index}`} scope="col" className="whitespace-nowrap px-3 py-3 font-bold">{label}</th>)}</tr></thead>
          <tbody>{result?.rows.map(row => <tr key={row.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--canvas)]/50">
            <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">{formatDate(row.created_at)}</td>
            <td className="max-w-44 px-3 py-3"><span dir="auto" className="block truncate font-semibold">{row.actor_name || 'مستخدم غير متاح'}</span>{row.actor_email && <small dir="ltr" className="mt-0.5 block truncate text-right text-xs text-[var(--muted)]">{row.actor_email}</small>}</td>
            <td className="whitespace-nowrap px-3 py-3">{sectionLabels[row.section] ?? 'قسم آخر'}</td>
            <td className="whitespace-nowrap px-3 py-3">{actionLabels[row.action] ?? 'حدث في النظام'}</td>
            <td className="max-w-40 px-3 py-3"><span dir="auto" className="block truncate">{row.entity_label || 'غير متاح'}</span></td>
            <td className="max-w-64 px-3 py-3"><span className="block truncate" title={translatedDescription(row)}>{translatedDescription(row)}</span></td>
            <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${row.outcome === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : row.outcome === 'denied' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'}`}>{outcomeLabels[row.outcome] ?? 'غير متاحة'}</span></td>
            <td className="px-3 py-3"><button type="button" onClick={() => setSelected(row)} className="whitespace-nowrap rounded-lg px-2.5 py-1.5 font-bold text-[var(--brand)] hover:bg-[var(--canvas)]" aria-label={`عرض تفاصيل ${actionLabels[row.action] ?? 'الحدث'} ${row.entity_label ?? ''}`}>التفاصيل</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      {loading && <div role="status" className="p-8 text-center text-sm text-[var(--muted)]"><span className="mx-auto mb-3 block size-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--brand)]" />جارٍ تحميل سجل النشاط…</div>}
      {!loading && !error && result?.rows.length === 0 && <div className="px-5 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--canvas)] text-[var(--muted)]"><Search size={21} /></span><h3 className="mt-3 font-black">لا توجد سجلات لعرضها</h3><p className="mt-1 text-sm text-[var(--muted)]">لم نعثر على أحداث تطابق عوامل التصفية. جرّب تغييرها أو اختر «كل الفترات».</p></div>}
      {!loading && error && !result && <p className="p-8 text-center text-sm text-[var(--muted)]">تعذر عرض السجلات حتى الآن.</p>}
    </section>

    <nav className="flex items-center justify-between gap-3" aria-label="التنقل بين صفحات السجل">
      <button type="button" disabled={!result || result.page <= 1 || loading} onClick={() => updateFilter('page', (result?.page ?? 1) - 1)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronRight size={17} />السابق</button>
      <span className="text-sm text-[var(--muted)]">صفحة <b className="text-[var(--text)]">{formatNumber(result?.page ?? 1)}</b> من <b className="text-[var(--text)]">{formatNumber(result?.pages ?? 1)}</b></span>
      <button type="button" disabled={!result || result.page >= result.pages || loading} onClick={() => updateFilter('page', (result?.page ?? 1) + 1)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold disabled:opacity-40">التالي<ChevronLeft size={17} /></button>
    </nav>

    {selected && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-3 sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="activity-details-title" dir="rtl" className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-5"><div><p className="text-xs font-bold text-[var(--brand)]">تفاصيل سجل النشاط</p><h2 id="activity-details-title" className="mt-1 text-xl font-black">{actionLabels[selected.action] ?? 'حدث في النظام'} · {sectionLabels[selected.section] ?? 'قسم آخر'}</h2><p className="mt-1 text-sm text-[var(--muted)]">{formatDate(selected.created_at)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="إغلاق التفاصيل" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] hover:bg-[var(--canvas)]"><X size={19} /></button></header>
        <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-5">
          <dl className="grid gap-3 sm:grid-cols-2">{recordDetails(selected).map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-[var(--canvas)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd dir={label.includes('معرّف') || label === 'البريد الإلكتروني' ? 'ltr' : undefined} className={`mt-1 break-words text-sm font-semibold ${label.includes('معرّف') || label === 'البريد الإلكتروني' ? 'text-left' : ''}`}>{String(value)}</dd></div>)}</dl>
          {Object.keys(selected.details ?? {}).length > 0 && <section><h3 className="mb-2 text-sm font-black">تفاصيل إضافية مسجلة</h3><dl className="grid gap-2 sm:grid-cols-2">{Object.entries(selected.details ?? {}).map(([key, value]) => <div key={key} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3"><dt className="text-xs text-[var(--muted)]">{detailLabels[key] ?? 'تفصيل إضافي'}</dt><dd dir={key.endsWith('_id') ? 'ltr' : 'auto'} className={`mt-1 break-words text-sm font-semibold ${key.endsWith('_id') ? 'text-left' : ''}`}>{detailValue(key, value)}</dd></div>)}</dl></section>}
          <p className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">تُعرض هنا البيانات المسجلة لهذا الحدث فقط. لا تُعرض كلمات المرور أو رموز الجلسات أو مفاتيح الوصول.</p>
        </div>
        <footer className="flex justify-end border-t border-[var(--line)] p-4"><button type="button" onClick={() => setSelected(null)} className="min-h-10 rounded-xl bg-[var(--brand)] px-5 py-2 font-bold text-white">إغلاق</button></footer>
      </section>
    </div>}
  </main>;
}
