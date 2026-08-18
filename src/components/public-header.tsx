import Link from 'next/link';
import Image from 'next/image';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppInstallButton } from '@/components/app-install-button';

const links = [['/', 'الرئيسية'], ['/sales', 'عروض البيع'], ['/rentals', 'عروض الإيجار'], ['/partners', 'شركاء النجاح'], ['/contact', 'تواصل معنا']] as const;

export async function PublicHeader() {
  let authenticated = false;
  if (isSupabaseConfigured) {
    try {
      const db = await createClient();
      authenticated = Boolean((await db.auth.getUser()).data.user);
    } catch {
      authenticated = false;
    }
  }

  return <header className="public-header border-b border-[var(--line)]"><div className="mx-auto flex min-h-18 max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4"><Link href="/" aria-label="القِرش - الرئيسية"><Image src="/brand/alqirsh-logo.jpg" alt="القِرش Alqirsh" width={180} height={180} className="h-12 w-auto rounded-lg object-contain" priority /></Link><nav className="order-3 flex w-full items-center gap-4 overflow-x-auto text-sm font-semibold text-[var(--muted)] sm:order-none sm:w-auto" aria-label="تنقل الموقع">{links.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap transition hover:text-[var(--brand)]">{label}</Link>)}</nav><div className="flex items-center gap-3"><AppInstallButton /><ThemeToggle /><Link href={authenticated ? '/dashboard' : '/login'} className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95">{authenticated ? 'لوحة التحكم' : 'تسجيل الدخول'}</Link></div></div></header>;
}
