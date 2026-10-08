import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) { const url = request.nextUrl.clone(); url.pathname = '/login'; return NextResponse.redirect(url); }
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase.from('profiles').select('role,status').eq('id',user.id).maybeSingle();
    if(profile?.status==='inactive'){const url=request.nextUrl.clone();url.pathname='/login';return NextResponse.redirect(url);}
    if(profile?.role!=='admin'){
      const {data:permissions}=await supabase.from('section_permissions').select('*').eq('user_id',user.id).maybeSingle();
      const path=request.nextUrl.pathname;
      const allowed=path==='/dashboard/profile'||
       (path==='/dashboard/cars'&&(permissions?.cars_sale_view||permissions?.cars_rent_view))||
       (path==='/dashboard/properties'&&(permissions?.properties_sale_view||permissions?.properties_rent_view))||
       (path.startsWith('/dashboard/property-management')&&permissions?.properties_management_view)||
       (path==='/dashboard/requests'&&(permissions?.properties_requests_view||permissions?.properties_requests_manage))||
       (path==='/dashboard/activity-log'&&permissions?.activity_logs_view)||
       (path==='/dashboard/users'&&permissions?.users_permissions_manage);
      if(!allowed){const url=request.nextUrl.clone();url.pathname=permissions?.cars_rent_view||permissions?.cars_sale_view?'/dashboard/cars':permissions?.properties_rent_view||permissions?.properties_sale_view?'/dashboard/properties':permissions?.properties_management_view?'/dashboard/property-management':permissions?.properties_requests_view?'/dashboard/requests':'/';return NextResponse.redirect(url);}
    }
  }
  return response;
}
export const config = { matcher: ['/dashboard/:path*'] };
