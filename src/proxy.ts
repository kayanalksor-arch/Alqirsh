import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }

    const [{ data: profile }, { data: permissions }] = await Promise.all([
      supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle(),
      supabase.from('section_permissions').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    if (!profile || profile.status !== 'active') {
      await supabase.rpc('record_denied_admin_access', { p_path: request.nextUrl.pathname });
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('reason', profile ? 'inactive' : 'unapproved');
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }

    const admin = profile.role === 'admin';
    const p = permissions as Record<string, boolean | null> | null;
    const canTrips = Boolean(p && [
      'bus_fleet_view','bus_fleet_manage','bus_trips_view','bus_trips_manage','bus_bookings_view','bus_bookings_manage',
      'bus_receipts_review','bus_qr_scan','bus_cash_collect','bus_finance_view','bus_expenses_manage','bus_refunds_manage','bus_audit_view','bus_reports_export',
    ].some((key) => p[key] === true));
    const canCarsSale = Boolean(p && ['cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete'].some((key) => p[key] === true));
    const canCarsRent = Boolean(p && ['cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete'].some((key) => p[key] === true));
    const canProperties = Boolean(p && [
      'properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete',
      'properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete',
    ].some((key) => p[key] === true));
    const anyPermission = Boolean(p && Object.entries(p).some(([key, value]) => key !== 'user_id' && key !== 'updated_at' && key !== 'updated_by' && value === true));
    const path = request.nextUrl.pathname;
    const allowed = admin
      || (path === '/dashboard' && anyPermission)
      || (path === '/dashboard/profile' && anyPermission)
      || ((path === '/dashboard/cars' || path.startsWith('/dashboard/cars/')) && (canCarsSale || canCarsRent))
      || ((path === '/dashboard/sales') && canCarsSale)
      || ((path === '/dashboard/rentals') && canCarsRent)
      || ((path === '/dashboard/properties' || path.startsWith('/dashboard/properties/')) && canProperties)
      || (path.startsWith('/dashboard/property-management') && p?.properties_management_view === true)
      || (path.startsWith('/dashboard/requests') && (p?.properties_requests_view === true || p?.properties_requests_manage === true))
      || (path.startsWith('/dashboard/trips') && canTrips)
      || (path.startsWith('/dashboard/activity-log') && p?.activity_logs_view === true)
      || (path.startsWith('/dashboard/users') && admin);

    if (!allowed) {
      await supabase.rpc('record_denied_admin_access', { p_path: path });
      const url = request.nextUrl.clone();
      url.pathname = canTrips ? '/dashboard/trips'
        : canCarsSale || canCarsRent ? '/dashboard/cars'
          : canProperties ? '/dashboard/properties'
            : p?.properties_management_view ? '/dashboard/property-management'
              : p?.properties_requests_view || p?.properties_requests_manage ? '/dashboard/requests' : '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }
  return response;
}
export const config = { matcher: ['/dashboard/:path*'] };
