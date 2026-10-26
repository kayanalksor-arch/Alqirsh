import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppInstallButton } from '@/components/app-install-button';
import { PublicMobileNav } from '@/components/public-mobile-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PublicDesktopNav } from '@/components/public-desktop-nav';
import { LocalizedText } from '@/components/language-provider';

const links = [['/', 'الرئيسية'], ['/properties', 'العقارات'], ['/cars', 'السيارات'], ['/partners', 'شركاء النجاح'], ['/contact', 'تواصل معنا']] as const;

export async function PublicHeader() {
  // This is only a presentation hint. Protected routes still verify the session
  // in the proxy; avoiding getUser() here prevents stale refresh cookies from
  // triggering an auth refresh on every public page render.
  const cookieStore = await cookies();
  const authenticated = cookieStore.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));

  return <header className="public-header border-b border-[var(--line)]"><div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-2 px-3 py-2 sm:min-h-18 sm:gap-4 sm:px-5 sm:py-4"><Link href="/" aria-label="القِرش - الرئيسية" className="min-w-0 shrink-0"><Image src="/brand/alqirsh-logo.png" alt="القِرش Alqirsh" width={180} height={180} className="h-10 w-auto max-w-[7rem] rounded-lg object-contain sm:h-12 sm:max-w-none" priority /></Link><PublicDesktopNav links={links} /><div className="mr-auto flex shrink-0 items-center gap-2 sm:mr-0 sm:gap-3"><AppInstallButton /><LanguageSwitcher /><ThemeToggle /><Link href={authenticated ? '/dashboard' : '/login'} className="hidden min-h-11 items-center rounded-xl bg-[var(--brand)] px-3 text-xs font-bold text-white transition hover:brightness-95 sm:inline-flex sm:px-4 sm:text-sm"><LocalizedText value={authenticated ? 'لوحة التحكم' : 'تسجيل الدخول'} /></Link><PublicMobileNav links={links} authenticated={authenticated} /></div></div></header>;
}
