'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, BookOpen, Building2, BusFront, CarFront, CircleHelp, ClipboardList, FileText, Globe2, Handshake, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, Shield, UserRound, Users, Wrench, X, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/components/language-provider';

type Icon = typeof Home;
type NavItem = { href: string; ar: string; en: string; icon: Icon; permissions?: string[]; adminOnly?: boolean };
type NavGroup = { id: string; ar: string; en: string; items: NavItem[] };
type Identity = { name: string; email: string; role: string; avatar: string | null };

const groups: NavGroup[] = [
  { id: 'site', ar: 'صفحات المنصة', en: 'Platform pages', items: [
    { href: '/', ar: 'الرئيسية', en: 'Home', icon: Home },
    { href: '/about', ar: 'من نحن', en: 'About us', icon: BookOpen },
    { href: '/properties', ar: 'العقارات', en: 'Properties', icon: Building2 },
    { href: '/cars', ar: 'السيارات', en: 'Cars', icon: CarFront },
    { href: '/trips', ar: 'الرحلات وحجز الباصات', en: 'Bus trips and booking', icon: BusFront },
    { href: '/partners', ar: 'الشركاء', en: 'Partners', icon: Handshake },
    { href: '/contact', ar: 'اتصل بنا', en: 'Contact us', icon: Globe2 },
    { href: '/faq', ar: 'الأسئلة الشائعة', en: 'Frequently asked questions', icon: CircleHelp },
  ] },
  { id: 'account', ar: 'حسابي', en: 'My account', items: [
    { href: '/dashboard/profile', ar: 'بياناتي الشخصية', en: 'My profile', icon: UserRound, permissions: ['__dashboard_profile'] },
    { href: '/trips/bookings', ar: 'حجوزاتي وتذاكري', en: 'My bookings and tickets', icon: ClipboardList },
  ] },
  { id: 'policies', ar: 'الشروط والسياسات', en: 'Terms and policies', items: [
    { href: '/terms', ar: 'الشروط والأحكام', en: 'Terms and conditions', icon: FileText },
    { href: '/privacy-policy', ar: 'سياسة الخصوصية', en: 'Privacy policy', icon: Shield },
    { href: '/listing-policy', ar: 'سياسة نشر العروض', en: 'Listing policy', icon: FileText },
    { href: '/cookie-policy', ar: 'سياسة ملفات الارتباط', en: 'Cookie policy', icon: FileText },
  ] },
  { id: 'admin', ar: 'الإدارة حسب الصلاحيات', en: 'Administration', items: [
    { href: '/dashboard', ar: 'لوحة التحكم', en: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/properties', ar: 'إدارة العقارات', en: 'Manage properties', icon: Building2, permissions: ['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete'] },
    { href: '/dashboard/cars', ar: 'إدارة السيارات', en: 'Manage cars', icon: CarFront, permissions: ['cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete'] },
    { href: '/dashboard/requests', ar: 'طلبات العملاء', en: 'Customer requests', icon: ClipboardList, permissions: ['properties_requests_view','properties_requests_manage'] },
    { href: '/dashboard/property-management', ar: 'إدارة الأملاك', en: 'Property management', icon: Wrench, permissions: ['properties_management_view'] },
    { href: '/dashboard/trips', ar: 'إدارة الرحلات والحجوزات', en: 'Trips and bookings', icon: BusFront, permissions: ['bus_fleet_view','bus_fleet_manage','bus_trips_view','bus_trips_manage','bus_bookings_view','bus_bookings_manage','bus_receipts_review','bus_tickets_issue','bus_qr_scan','bus_boarding_record','bus_cash_collect','bus_finance_view','bus_expenses_manage','bus_refunds_manage','bus_audit_view','bus_reports_export'] },
    { href: '/dashboard/trips/scan', ar: 'قارئ التذاكر QR', en: 'QR ticket scanner', icon: BusFront, permissions: ['bus_qr_scan'] },
    { href: '/dashboard/users', ar: 'إدارة المستخدمين', en: 'Manage users', icon: Users, adminOnly: true },
    { href: '/dashboard/partners', ar: 'إدارة الشركاء', en: 'Manage partners', icon: Handshake, adminOnly: true },
    { href: '/dashboard/activity-log', ar: 'سجل العمليات', en: 'Activity log', icon: Activity, permissions: ['activity_logs_view'] },
    { href: '/dashboard/settings', ar: 'إعدادات المنصة', en: 'Platform settings', icon: Settings, adminOnly: true },
  ] },
];

function SidebarContent({ collapsed, onNavigate, identity, visibleGroups, query, setQuery, pendingRequestCount }: {
  collapsed: boolean; onNavigate?: () => void; identity: Identity | null; visibleGroups: NavGroup[]; query: string; setQuery: (value: string) => void; pendingRequestCount: number;
}) {
  const { locale } = useLanguage();
  const en = locale === 'en';
  const pathname = usePathname();
  return <>
    <Link href="/dashboard" onClick={onNavigate} title={en ? 'Alqirsh dashboard' : 'لوحة القرش'} className={`flex items-center gap-3 border-b border-[var(--line)] pb-4 ${collapsed ? 'justify-center' : 'pb-5'}`}>
      <Image src="/brand/alqirsh-icon-192.png" alt="Alqirsh" width={44} height={44} className="size-11 shrink-0 rounded-xl object-contain" priority />
      {!collapsed && <span className="min-w-0"><b className="block">{en ? 'Alqirsh' : 'القرش'}</b><small className="text-[var(--muted)]">{en ? 'Your platform' : 'منصتك في مكان واحد'}</small></span>}
    </Link>
    {identity && <div className={`my-4 flex items-center gap-3 rounded-xl bg-[var(--canvas)] p-3 ${collapsed ? 'justify-center p-2' : ''}`} title={`${identity.name} · ${identity.role}`}>
      {identity.avatar ? <Image src={identity.avatar} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-full border border-[var(--line)] object-cover" /> : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--brand)]"><UserRound size={18}/></span>}
      {!collapsed && <span className="min-w-0"><b className="block truncate text-sm">{identity.name}</b><small className="block truncate text-xs text-[var(--muted)]">{identity.role} · {identity.email}</small></span>}
    </div>}
    {!collapsed && <label className="my-3 flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3"><Search size={16} className="text-[var(--muted)]"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={en ? 'Search navigation' : 'ابحث في القائمة'} aria-label={en ? 'Search navigation' : 'ابحث في القائمة'} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>}
    <nav className={`min-h-0 flex-1 space-y-4 overflow-y-auto ${collapsed ? 'mt-4' : ''}`} aria-label={en ? 'Platform navigation' : 'التنقل في المنصة'}>
      {visibleGroups.map((group) => <section key={group.id}>
        {!collapsed && <h2 className="mb-1 px-3 pt-1 text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">{en ? group.en : group.ar}</h2>}
        <div className="space-y-1">{group.items.map(({ href, ar, en: english, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
          const className = active ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200' : 'text-[var(--muted)] hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100';
          return <Link key={href} href={href} onClick={onNavigate} title={collapsed ? (en ? english : ar) : undefined} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${collapsed ? 'justify-center px-0' : ''} ${className}`}><Icon size={18} aria-hidden="true" />{!collapsed && <span className="min-w-0 flex-1">{en ? english : ar}</span>}{href === '/dashboard/requests' && pendingRequestCount > 0 && <span className="min-w-5 rounded-full bg-amber-100 px-1.5 py-0.5 text-center text-[10px] font-black text-amber-900" aria-label={en ? `${pendingRequestCount} pending requests` : `${pendingRequestCount} طلبات معلقة`}>{pendingRequestCount > 99 ? '99+' : pendingRequestCount}</span>}</Link>;
        })}</div>
      </section>)}
    </nav>
    <div className={`mt-4 space-y-2 border-t border-[var(--line)] pt-4 ${collapsed ? 'text-xs' : ''}`}>
      <Link href="/" onClick={onNavigate} title={en ? 'View website' : 'عرض الموقع'} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--canvas)] ${collapsed ? 'px-0' : ''}`}><Globe2 size={17}/>{!collapsed && (en ? 'View website' : 'عرض الموقع')}</Link>
      <div className={collapsed ? 'overflow-hidden' : ''}><LogoutButton compact={collapsed}/></div>
    </div>
  </>;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { locale, t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [visibleItems, setVisibleItems] = useState<NavItem[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [query, setQuery] = useState('');
  const en = locale === 'en';

  useEffect(() => {
    if (window.localStorage.getItem('alqirsh-sidebar-collapsed') === 'true') {
      const frame = window.requestAnimationFrame(() => setCollapsed(true));
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) return () => { document.body.style.overflow = ''; };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKeyDown); };
  }, [open]);
  useEffect(() => {
    let live = true;
    const loadNavigation = async () => {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) { if (live) { setIdentity(null); setVisibleItems([]); setPendingRequestCount(0); } return; }
      const [{ data: profile }, { data: p }] = await Promise.all([
        db.from('profiles').select('role,status,full_name,email,avatar_url').eq('id', user.id).maybeSingle(),
        db.from('section_permissions').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!live) return;
      if (profile?.status !== 'active') { setIdentity(null); setVisibleItems([]); setPendingRequestCount(0); return; }
      const admin = profile.role === 'admin';
      const permissionMap = (p ?? {}) as Record<string, unknown>;
      const has = (keys: string[]) => admin || keys.some((key) => permissionMap[key] === true);
      const anyPermission = Object.entries(permissionMap).some(([key, value]) => !['user_id','updated_at','updated_by'].includes(key) && value === true);
      let pendingCount = 0;
      if (admin || permissionMap.properties_requests_view === true || permissionMap.properties_requests_manage === true) {
        const { count } = await db.from('requests').select('id', { count: 'exact', head: true }).in('status', ['new', 'pending']);
        pendingCount = count ?? 0;
      }
      const role = admin ? (en ? 'Administrator' : 'مدير النظام') : profile.role === 'property_manager' ? (en ? 'Property manager' : 'مدير الأملاك') : (en ? 'Staff member' : 'موظف');
      setIdentity({ name: profile.full_name || user.user_metadata.full_name || user.email || (en ? 'User' : 'مستخدم'), email: user.email ?? '', role, avatar: profile.avatar_url || user.user_metadata.avatar_url || user.user_metadata.picture || null });
      const dashboardItems = groups.find((group) => group.id === 'admin')!.items.filter((item) => {
        if (item.href === '/dashboard') return admin || anyPermission;
        if (item.adminOnly) return admin;
        return !item.permissions || has(item.permissions);
      });
      const accountItems = groups.find((group) => group.id === 'account')!.items.filter((item) => item.href !== '/dashboard/profile' || admin || anyPermission);
      if (live) {
        setVisibleItems([...groups.filter((group) => group.id !== 'admin' && group.id !== 'account').flatMap((group) => group.items), ...accountItems, ...dashboardItems]);
        setPendingRequestCount(pendingCount);
      }
    };
    void loadNavigation();
    const onFocus = () => void loadNavigation();
    window.addEventListener('focus', onFocus);
    return () => { live = false; window.removeEventListener('focus', onFocus); };
  }, [en, pathname]);

  const visibleGroups = useMemo(() => groups.map((group) => ({ ...group, items: group.items.filter((item) => visibleItems.some((visible) => visible.href === item.href) && (!query.trim() || (en ? item.en : item.ar).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))) })).filter((group) => group.items.length), [en, query, visibleItems]);
  function toggleCollapsed() { setCollapsed((current) => { const next = !current; window.localStorage.setItem('alqirsh-sidebar-collapsed', String(next)); return next; }); }

  return <div className="app-shell flex min-h-screen" dir={en ? 'ltr' : 'rtl'}>
    <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-[var(--line)] bg-[var(--surface)] p-4 transition-[width] duration-200 lg:flex ${en ? 'border-r' : 'border-l'} ${collapsed ? 'w-20' : 'w-80'}`}>
      <SidebarContent collapsed={collapsed} identity={identity} visibleGroups={visibleGroups} query={query} setQuery={setQuery} pendingRequestCount={pendingRequestCount}/>
    </aside>
    <div className="relative min-w-0 flex-1"><header className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-3 sm:px-4 lg:absolute lg:top-5 lg:z-30 lg:h-auto lg:border-0 lg:bg-transparent lg:p-0 ${en ? 'lg:right-6' : 'lg:left-6'}`}>
      <div className="flex items-center gap-2"><button type="button" aria-label={t(en ? 'Open menu' : 'فتح القائمة')} onClick={() => setOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] lg:hidden"><Menu size={20}/></button><button type="button" onClick={toggleCollapsed} aria-label={en ? (collapsed ? 'Expand sidebar' : 'Collapse sidebar') : (collapsed ? 'توسيع القائمة الجانبية' : 'تصغير القائمة الجانبية')} className="hidden size-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] lg:grid">{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button><b className="min-w-0 truncate px-2 lg:hidden">{t('القِرش')}</b></div>
      <div className="flex shrink-0 items-center gap-2"><LanguageSwitcher/><ThemeToggle/></div>
    </header><section className="min-w-0 flex-1">{children}</section></div>
    {open && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={en ? 'Dashboard menu' : 'قائمة لوحة التحكم'} dir={en ? 'ltr' : 'rtl'}><button type="button" aria-label={en ? 'Close menu' : 'إغلاق القائمة'} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45 motion-safe:animate-[sidebar-fade-in_160ms_ease-out]"/><aside className={`absolute inset-y-0 flex h-full w-[min(21rem,88vw)] flex-col overflow-y-auto bg-[var(--surface)] p-4 shadow-2xl motion-safe:animate-[sidebar-enter_180ms_ease-out] ${en ? 'left-0' : 'right-0'}`}><button type="button" onClick={() => setOpen(false)} aria-label={en ? 'Close menu' : 'إغلاق القائمة'} className={`absolute top-4 grid size-10 place-items-center rounded-xl border border-[var(--line)] ${en ? 'right-4' : 'left-4'}`}><X size={18}/></button><div className="mb-5 min-h-10"/><SidebarContent collapsed={false} onNavigate={() => setOpen(false)} identity={identity} visibleGroups={visibleGroups} query={query} setQuery={setQuery} pendingRequestCount={pendingRequestCount}/></aside></div>}
  </div>;
}
