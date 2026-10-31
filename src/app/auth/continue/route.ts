import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

const any = (permissions: Record<string, unknown> | null, keys: string[]) => Boolean(permissions && keys.some((key) => permissions[key] === true));

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const requested = url.searchParams.get('next') ?? '';
  const requestedSafe = requested.startsWith('/') && !requested.startsWith('//') ? requested : '';
  const cookieStore = await cookies();
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } });
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    url.pathname = '/login'; url.search = '';
    return NextResponse.redirect(url);
  }

  const [{ data: profile }, { data: permissions }] = await Promise.all([
    db.from('profiles').select('role,status').eq('id', user.id).maybeSingle(),
    db.from('section_permissions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  if (profile?.status !== 'active') {
    await db.auth.signOut();
    url.pathname = '/login'; url.search = '';
    url.searchParams.set('reason', profile ? 'inactive' : 'unapproved');
    return NextResponse.redirect(url);
  }
  // Records login time without deriving or granting access.
  if (url.searchParams.get('from') !== 'account') { const { error: logError } = await db.rpc('record_my_login'); if (logError) console.error('[auth] Could not record sign-in:', logError); }

  const p = permissions as Record<string, unknown> | null;
  const admin = profile.role === 'admin';
  const canTrips = any(p, ['bus_fleet_view','bus_fleet_manage','bus_trips_view','bus_trips_manage','bus_bookings_view','bus_bookings_manage','bus_receipts_review','bus_qr_scan','bus_cash_collect','bus_finance_view','bus_expenses_manage','bus_refunds_manage','bus_audit_view','bus_reports_export']);
  const canCars = any(p, ['cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete']);
  const canProperties = any(p, ['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete']);
  const hasAnyPermission = Boolean(p && Object.entries(p).some(([key, value]) => !['user_id','updated_at','updated_by'].includes(key) && value === true));
  const hasAccess = (path: string) => admin
    || (path === '/dashboard' && hasAnyPermission)
    || (path === '/dashboard/profile' && hasAnyPermission)
    || (path.startsWith('/dashboard/trips') && canTrips)
    || ((path === '/dashboard/cars' || path.startsWith('/dashboard/cars/')) && canCars)
    || (path === '/dashboard/sales' && any(p, ['cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete']))
    || (path === '/dashboard/rentals' && any(p, ['cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete']))
    || ((path === '/dashboard/properties' || path.startsWith('/dashboard/properties/')) && canProperties)
    || (path.startsWith('/dashboard/property-management') && p?.properties_management_view === true)
    || (path.startsWith('/dashboard/requests') && any(p, ['properties_requests_view','properties_requests_manage']))
    || (path.startsWith('/dashboard/activity-log') && p?.activity_logs_view === true)
    || (path.startsWith('/dashboard/users') && admin);
  if (requestedSafe.startsWith('/dashboard') && !hasAccess(requestedSafe)) await db.rpc('record_denied_admin_access', { p_path: requestedSafe });

  let destination = '/trips/bookings';
  if (requestedSafe === '/auth/update-password' || requestedSafe === '/trips/bookings') destination = requestedSafe;
  else if (requestedSafe.startsWith('/dashboard') && hasAccess(requestedSafe)) destination = requestedSafe;
  else if (admin) destination = '/dashboard';
  else if (canTrips) destination = '/dashboard/trips';
  else if (canCars) destination = '/dashboard/cars';
  else if (canProperties) destination = '/dashboard/properties';
  else if (p?.properties_management_view === true) destination = '/dashboard/property-management';
  else if (any(p, ['properties_requests_view','properties_requests_manage'])) destination = '/dashboard/requests';
  else if (p?.activity_logs_view === true) destination = '/dashboard/activity-log';

  url.pathname = destination; url.search = '';
  return NextResponse.redirect(url);
}
