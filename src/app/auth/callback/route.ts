import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';
  const safeNext = next === '/auth/update-password' || next === '/trips/bookings'
    ? next
    : next.startsWith('/dashboard') && !next.startsWith('//') ? next : '/dashboard';

  if (!code) {
    url.pathname = '/login'; url.search = ''; url.searchParams.set('reason', 'oauth');
    return NextResponse.redirect(url);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    url.pathname = '/login'; url.search = ''; url.searchParams.set('reason', 'oauth');
    return NextResponse.redirect(url);
  }

  url.pathname = safeNext === '/auth/update-password' ? safeNext : '/auth/continue';
  url.search = '';
  if (url.pathname === '/auth/continue') url.searchParams.set('next', safeNext);
  return NextResponse.redirect(url);
}
