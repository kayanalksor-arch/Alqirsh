'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BookOpen, Building2, CarFront, ChevronDown, CircleHelp, ClipboardList, FileText, Home, LayoutDashboard, LockKeyhole, Menu, Phone, Search, Shield, Users, UserRound, X, BusFront, Wrench, Handshake } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import { LogoutButton } from '@/components/logout-button';

type PermissionMap = Record<string, boolean | undefined>;
type Item = { href: string; ar: string; en: string; icon: typeof Home; permissions?: string[]; adminOnly?: boolean };
type Group = { id: string; ar: string; en: string; items: Item[] };

const groups: Group[] = [
  { id: 'site', ar: 'استكشف المنصة', en: 'Explore Alqirsh', items: [
    { href: '/', ar: 'الرئيسية', en: 'Home', icon: Home },
    { href: '/about', ar: 'من نحن', en: 'About us', icon: BookOpen },
    { href: '/properties', ar: 'العقارات', en: 'Properties', icon: Building2 },
    { href: '/cars', ar: 'السيارات', en: 'Cars', icon: CarFront },
    { href: '/trips', ar: 'الرحلات وحجز الباصات', en: 'Bus trips and booking', icon: BusFront },
    { href: '/partners', ar: 'الشركاء', en: 'Partners', icon: Handshake },
    { href: '/contact', ar: 'اتصل بنا', en: 'Contact us', icon: Phone },
    { href: '/faq', ar: 'الأسئلة الشائعة', en: 'Frequently asked questions', icon: CircleHelp },
  ] },
  { id: 'account', ar: 'حساب المستخدم', en: 'Your account', items: [
    { href: '/trips/bookings', ar: 'حجوزاتي وتذاكري', en: 'My bookings and tickets', icon: ClipboardList },
    { href: '/forgot-password', ar: 'استعادة كلمة المرور', en: 'Reset password', icon: LockKeyhole },
    { href: '/dashboard/profile', ar: 'بياناتي الشخصية', en: 'My profile', icon: UserRound, permissions: ['dashboard_profile'] },
  ] },
  { id: 'policies', ar: 'الشروط والسياسات', en: 'Terms and policies', items: [
    { href: '/terms', ar: 'الشروط والأحكام', en: 'Terms and conditions', icon: FileText },
    { href: '/privacy-policy', ar: 'سياسة الخصوصية', en: 'Privacy policy', icon: Shield },
    { href: '/listing-policy', ar: 'سياسة نشر العروض', en: 'Listing policy', icon: FileText },
    { href: '/cookie-policy', ar: 'سياسة ملفات الارتباط', en: 'Cookie policy', icon: FileText },
  ] },
  { id: 'admin', ar: 'لوحة التحكم والإدارة', en: 'Dashboard and administration', items: [
    { href: '/dashboard', ar: 'لوحة التحكم', en: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/properties', ar: 'إدارة العقارات', en: 'Manage properties', icon: Building2, permissions: ['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete'] },
    { href: '/dashboard/cars', ar: 'إدارة السيارات', en: 'Manage cars', icon: CarFront, permissions: ['cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete'] },
    { href: '/dashboard/requests', ar: 'طلبات العملاء', en: 'Customer requests', icon: ClipboardList, permissions: ['properties_requests_view','properties_requests_manage'] },
    { href: '/dashboard/property-management', ar: 'إدارة الأملاك', en: 'Property management', icon: Wrench, permissions: ['properties_management_view'] },
    { href: '/dashboard/trips', ar: 'الرحلات والحجوزات', en: 'Trips and bookings', icon: BusFront, permissions: ['bus_fleet_view','bus_fleet_manage','bus_trips_view','bus_trips_manage','bus_bookings_view','bus_bookings_manage','bus_receipts_review','bus_tickets_issue','bus_qr_scan','bus_boarding_record','bus_cash_collect','bus_finance_view','bus_expenses_manage','bus_refunds_manage','bus_audit_view','bus_reports_export'] },
    { href: '/dashboard/trips/scan', ar: 'قارئ التذاكر QR', en: 'QR ticket scanner', icon: BusFront, permissions: ['bus_qr_scan'] },
    { href: '/dashboard/users', ar: 'إدارة المستخدمين', en: 'Manage users', icon: Users, adminOnly: true },
    { href: '/dashboard/partners', ar: 'إدارة الشركاء', en: 'Manage partners', icon: Handshake, adminOnly: true },
    { href: '/dashboard/activity-log', ar: 'سجل العمليات', en: 'Activity log', icon: Activity, permissions: ['activity_logs_view'] },
    { href: '/dashboard/settings', ar: 'إعدادات المنصة', en: 'Platform settings', icon: Shield, adminOnly: true },
  ] },
];

export function PublicMobileNav({ signedIn, canAccessDashboard, userName, userRole, avatarUrl, permissions = {}, pendingRequestCount = 0 }: {
  signedIn: boolean;
  canAccessDashboard: boolean;
  userName?: string | null;
  userRole?: string | null;
  avatarUrl?: string | null;
  permissions?: PermissionMap;
  pendingRequestCount?: number;
}) {
  const { t, locale } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const en = locale === 'en';
  const role = userRole === 'admin' ? (en ? 'Administrator' : 'مدير النظام') : userRole === 'property_manager' ? (en ? 'Property manager' : 'مدير أملاك') : (en ? 'Customer account' : 'حساب عميل');
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && userRole !== 'admin') return false;
      if (item.permissions && !item.permissions.some((key) => key === 'dashboard_profile' ? canAccessDashboard : permissions[key] === true)) return false;
      if (group.id === 'account' && !signedIn) return false;
      if (group.id === 'admin' && !canAccessDashboard) return false;
      const label = en ? item.en : item.ar;
      return !query.trim() || label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    }),
  })).filter((group) => group.items.length > 0), [canAccessDashboard, en, permissions, query, signedIn, userRole]);

  function close() { setOpen(false); setQuery(''); }
  function toggleGroup(id: string) { setCollapsedGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); setQuery(''); } };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]" aria-label={t(en ? 'Open menu' : 'فتح القائمة')} aria-expanded={open}>
      <Menu size={20} aria-hidden="true" />
    </button>
    {open && <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={en ? 'Site navigation' : 'قائمة التنقل'} dir={en ? 'ltr' : 'rtl'}>
      <button type="button" onClick={close} className="absolute inset-0 bg-black/50 backdrop-blur-[2px] motion-safe:animate-[sidebar-fade-in_160ms_ease-out]" aria-label={en ? 'Close menu' : 'إغلاق القائمة'} />
      <aside className="absolute inset-y-0 start-0 flex w-[min(23rem,90vw)] flex-col border-e border-[var(--line)] bg-[var(--surface)] shadow-2xl motion-safe:animate-[sidebar-enter_180ms_ease-out] sm:w-96">
        <header className="flex items-center gap-3 border-b border-[var(--line)] p-4 sm:p-5">
          <Image src="/brand/alqirsh-icon-192.png" alt="Alqirsh" width={44} height={44} className="size-11 rounded-xl object-contain" />
          <div className="min-w-0 flex-1"><strong className="block truncate">{userName || (en ? 'Alqirsh platform' : 'منصة القرش')}</strong><span className="text-xs text-[var(--muted)]">{signedIn ? role : (en ? 'Welcome to Alqirsh' : 'مرحبًا بك في القرش')}</span></div>
          {avatarUrl ? <Image src={avatarUrl} alt="" width={40} height={40} unoptimized className="size-10 rounded-full border border-[var(--line)] object-cover" /> : signedIn ? <span className="grid size-10 place-items-center rounded-full bg-[var(--primary-soft)] font-black text-[var(--brand)]"><UserRound size={18}/></span> : null}
          <button type="button" onClick={close} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)]" aria-label={en ? 'Close menu' : 'إغلاق القائمة'}><X size={19}/></button>
        </header>
        <div className="border-b border-[var(--line)] p-3 sm:p-4"><label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-3"><Search size={17} className="text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={en ? 'Search menu' : 'ابحث في القائمة'} aria-label={en ? 'Search menu' : 'ابحث في القائمة'} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>
        <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          {visibleGroups.map((group) => <section key={group.id} className="rounded-xl border border-[var(--line)] p-2">
            <button type="button" onClick={() => toggleGroup(group.id)} className="flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-xs font-black uppercase tracking-wide text-[var(--muted)]"><span>{en ? group.en : group.ar}</span><ChevronDown size={16} className={`transition-transform ${collapsedGroups.includes(group.id) ? '-rotate-90' : ''}`} /></button>
            {!collapsedGroups.includes(group.id) && <div className="mt-1 grid gap-1">{group.items.map(({ href, ar, en: english, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} onClick={close} title={en ? english : ar} aria-current={active ? 'page' : undefined} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${active ? 'bg-[var(--primary-soft)] text-[var(--brand)]' : 'text-[var(--ink)] hover:bg-[var(--canvas)]'}`}><Icon size={17} aria-hidden="true"/><span className="min-w-0 flex-1">{en ? english : ar}</span>{href === '/dashboard/requests' && pendingRequestCount > 0 && <span className="min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-black text-amber-900" aria-label={en ? `${pendingRequestCount} pending requests` : `${pendingRequestCount} طلبات معلقة`}>{pendingRequestCount > 99 ? '99+' : pendingRequestCount}</span>}</Link>;
            })}</div>}
          </section>)}
          {!visibleGroups.length && <p className="p-5 text-center text-sm text-[var(--muted)]">{en ? 'No matching pages' : 'لا توجد صفحات مطابقة'}</p>}
        </nav>
        <footer className="sticky bottom-0 border-t border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
          {signedIn ? <LogoutButton /> : <div className="grid grid-cols-2 gap-2"><Link href="/login" onClick={close} className="rounded-xl bg-[var(--brand)] px-3 py-3 text-center text-sm font-bold text-white">{en ? 'Sign in' : 'تسجيل الدخول'}</Link><Link href="/signup" onClick={close} className="rounded-xl border border-[var(--line)] px-3 py-3 text-center text-sm font-bold">{en ? 'Create account' : 'إنشاء حساب'}</Link></div>}
        </footer>
      </aside>
    </div>}
  </>;
}
