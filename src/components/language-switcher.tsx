'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const next = locale === 'ar' ? 'en' : 'ar';
  const label = locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية';

  return <button type="button" onClick={() => setLocale(next)} title={label} aria-label={label} className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-xs font-black text-[var(--foreground)] shadow-[0_8px_24px_rgba(8,35,28,0.12)] transition hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
    <Languages size={16} aria-hidden="true" /><span>{next.toUpperCase()}</span>
  </button>;
}
