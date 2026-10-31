import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppInstallButton } from '@/components/app-install-button';
import { PublicMobileNav } from '@/components/public-mobile-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PublicDesktopNav } from '@/components/public-desktop-nav';
import { LocalizedText } from '@/components/language-provider';
import { createClient } from '@/lib/supabase/server';

const links = [['/', 'الرئيسية'], ['/properties', 'العقارات'], ['/cars', 'السيارات'], ['/trips', 'رحلات وحجز الباصات'], ['/trips/bookings', 'My trip bookings'], ['/partners', 'شركاء النجاح'], ['/contact', 'تواصل معنا']] as const;
const dashboardPermissionKeys = [
  'bus_fleet_view', 'bus_fleet_manage', 'bus_trips_view', 'bus_trips_manage', 'bus_bookings_view', 'bus_bookings_manage', 'bus_receipts_review', 'bus_qr_scan', 'bus_cash_collect', 'bus_finance_view', 'bus_expenses_manage', 'bus_refunds_manage', 'bus_audit_view', 'bus_reports_export',
  'cars_sale_view', 'cars_sale_create', 'cars_sale_update', 'cars_sale_delete', 'cars_rent_view', 'cars_rent_create', 'cars_rent_update', 'cars_rent_delete',
  'properties_sale_view', 'properties_sale_create', 'properties_sale_update', 'properties_sale_delete', 'properties_rent_view', 'properties_rent_create', 'properties_rent_update', 'properties_rent_delete',
  'properties_management_view', 'properties_requests_view', 'properties_requests_manage', 'activity_logs_view',
];

export async function PublicHeader() {
  let signedIn = false;
  let canAccessDashboard = false;
  let userName: string | null = null;
  let userRole: string | null = null;
  let avatarUrl: string | null = null;
  let permissionMap: Record<string, boolean> = {};
  let pendingRequestCount = 0;
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      const [{ data: profile }, { data: permissions }] = await Promise.all([
        db.from('profiles').select('role,status,full_name,avatar_url').eq('id', user.id).maybeSingle(),
        db.from('section_permissions').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      userName = profile?.full_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? null;
      userRole = profile?.role ?? null;
      avatarUrl = profile?.avatar_url ?? user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null;
      if (permissions) permissionMap = Object.fromEntries(Object.entries(permissions).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
      const hasPermission = Boolean(permissions && dashboardPermissionKeys.some((key) => permissions[key as keyof typeof permissions] === true));
      canAccessDashboard = profile?.status === 'active' && (profile.role === 'admin' || hasPermission);
      if (canAccessDashboard && (profile?.role === 'admin' || permissionMap.properties_requests_view || permissionMap.properties_requests_manage)) {
        const { count } = await db.from('requests').select('id', { count: 'exact', head: true }).in('status', ['new', 'pending']);
        pendingRequestCount = count ?? 0;
      }
    }
  } catch {
    // Fail closed: a session or permission lookup error must not expose the dashboard link.
  }

  return <header className="public-header border-b border-[var(--line)]"><div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-2 px-3 py-2 sm:min-h-18 sm:gap-4 sm:px-5 sm:py-4"><Link href="/" aria-label="القِرش - الرئيسية" className="min-w-0 shrink-0"><Image src="/brand/alqirsh-logo.png" alt="القِرش Alqirsh" width={180} height={180} className="h-10 w-auto max-w-[7rem] rounded-lg object-contain sm:h-12 sm:max-w-none" priority /></Link><PublicDesktopNav links={links} /><div className="mr-auto flex shrink-0 items-center gap-2 sm:mr-0 sm:gap-3"><AppInstallButton /><LanguageSwitcher /><ThemeToggle />{canAccessDashboard ? <Link href="/auth/continue?from=account" className="hidden min-h-11 items-center rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-white transition hover:brightness-95 sm:inline-flex sm:px-4 sm:text-sm"><LocalizedText value="لوحة التحكم" /></Link> : !signedIn ? <Link href="/login" className="hidden min-h-11 items-center rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-white transition hover:brightness-95 sm:inline-flex sm:px-4 sm:text-sm"><LocalizedText value="تسجيل الدخول" /></Link> : null}<PublicMobileNav signedIn={signedIn} canAccessDashboard={canAccessDashboard} userName={userName} userRole={userRole} avatarUrl={avatarUrl} permissions={permissionMap} pendingRequestCount={pendingRequestCount} /></div></div></header>;
}
