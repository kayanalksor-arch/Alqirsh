'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

type PublicLink = readonly [string, string];

export function PublicDesktopNav({ links }: { links: readonly PublicLink[] }) {
  const { t } = useLanguage();
  return <nav className="hidden flex-1 items-center justify-center gap-4 text-sm font-semibold text-[var(--muted)] sm:flex" aria-label={t('التنقل في الموقع')}>
    {links.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap transition hover:text-[var(--brand)]">{t(label)}</Link>)}
  </nav>;
}
