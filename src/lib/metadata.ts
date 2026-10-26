import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { translate, type Locale } from '@/lib/i18n';

function localize(value: unknown, locale: Locale, key?: string): unknown {
  if (value instanceof URL) return value;
  // Metadata enums are machine-readable values expected by Next.js and social
  // platforms. Keep those canonical English tokens intact when localizing.
  if (key === 'type' || key === 'card' || key === 'locale' || key === 'url' || key === 'canonical') return value;
  if (typeof value === 'string') return translate(value, locale);
  if (Array.isArray(value)) return value.map((item) => localize(item, locale));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, item]) => [childKey, localize(item, locale, childKey)]));
  }
  return value;
}

/** Apply the persisted interface language to metadata fields managed by the app. */
export async function localizedMetadata(metadata: Metadata): Promise<Metadata> {
  const cookieLocale = (await cookies()).get('alqirsh-language')?.value;
  const locale: Locale = cookieLocale === 'en' ? 'en' : 'ar';
  const result = localize(metadata, locale) as Metadata;
  const title = typeof result.title === 'string'
    ? result.title
    : result.title && typeof result.title === 'object' && 'default' in result.title
      ? result.title.default
      : undefined;
  const description = typeof result.description === 'string' ? result.description : undefined;
  if (description) {
    const canonical = typeof result.alternates?.canonical === 'string' ? result.alternates.canonical : undefined;
    const image = '/brand/alqirsh-logo.png';
    result.openGraph = {
      type: 'website',
      siteName: 'القرش | Alqirsh',
      ...result.openGraph,
      ...(title && !result.openGraph?.title ? { title } : {}),
      ...(!result.openGraph?.description ? { description } : {}),
      ...(canonical && !result.openGraph?.url ? { url: canonical } : {}),
      ...(!result.openGraph?.images ? { images: [{ url: image, alt: 'القرش | Alqirsh' }] } : {}),
    };
    result.twitter = {
      card: 'summary_large_image',
      ...result.twitter,
      ...(title && !result.twitter?.title ? { title } : {}),
      ...(!result.twitter?.description ? { description } : {}),
      ...(!result.twitter?.images ? { images: [image] } : {}),
    };
  }
  if (locale === 'en' && result.openGraph && typeof result.openGraph === 'object') {
    result.openGraph.locale = 'en_EG';
  }
  return result;
}
