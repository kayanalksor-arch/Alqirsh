'use client';

import { useLanguage } from '@/components/language-provider';

/**
 * User-authored prose is never machine translated or rewritten. When it is
 * Arabic in the English interface, make the original-language limitation
 * explicit while preserving the source text verbatim.
 */
export function LocalizedUserContent({ value, className }: { value: string | null | undefined; className?: string }) {
  const { locale, t } = useLanguage();
  if (!value) return null;
  const containsArabic = /[\u0600-\u06FF]/.test(value);
  return <>
    <span className={className} dir={containsArabic ? 'auto' : undefined}>{value}</span>
    {locale === 'en' && containsArabic && <small className="mt-1 block text-xs font-normal text-[var(--muted)]">{t('المحتوى الأصلي بالعربية — لا تتوفر ترجمة لهذا النص.')}</small>}
  </>;
}
