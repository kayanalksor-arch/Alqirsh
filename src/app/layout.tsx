import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';
import { LanguageProvider } from '@/components/language-provider';
import { cookies } from 'next/headers';
import { localizedMetadata } from '@/lib/metadata';
import { PublicAssistant } from '@/components/public-assistant';
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  return localizedMetadata({
  metadataBase: new URL('https://alqirsh.online'),
  title: {
    default: locale === 'en' ? 'Alqirsh | Properties, Cars and Bus Trips in Egypt' : 'القرش | عقارات وسيارات ورحلات باص في مصر | Alqirsh',
    template: locale === 'en' ? '%s | Alqirsh' : '%s | القرش | Alqirsh',
  },
  description: locale === 'en'
    ? 'Browse property and car listings for sale and rent, plus published bus trips and booking details on Alqirsh.'
    : 'تصفح عروض العقارات والسيارات للبيع والإيجار، ورحلات الباص المنشورة وتفاصيل الحجز على منصة القرش.',
  keywords: locale === 'en'
    ? ['Alqirsh', 'properties in Egypt', 'cars in Egypt', 'bus trips in Egypt']
    : ['القرش', 'عقارات في مصر', 'سيارات في مصر', 'رحلات باص في مصر'],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  openGraph: {
    type: 'website', locale: locale === 'en' ? 'en_EG' : 'ar_EG', siteName: 'القرش | Alqirsh',
    url: 'https://alqirsh.online/',
    title: locale === 'en' ? 'Alqirsh | Properties, Cars and Bus Trips in Egypt' : 'القرش | عقارات وسيارات ورحلات باص في مصر | Alqirsh',
    description: locale === 'en' ? 'Browse property and car listings for sale and rent, plus published bus trips and booking details on Alqirsh.' : 'تصفح عروض العقارات والسيارات للبيع والإيجار، ورحلات الباص المنشورة وتفاصيل الحجز على منصة القرش.',
    images: [{ url: '/brand/alqirsh-logo.png', alt: 'القرش | Alqirsh' }],
  },
  twitter: { card: 'summary_large_image' },
  manifest: '/manifest.webmanifest',
  applicationName: 'القِرش',
  icons: {
    icon: [
      { url: '/brand/alqirsh-icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/alqirsh-icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/brand/alqirsh-icon-512.png', type: 'image/png', sizes: '512x512' }],
  },
  appleWebApp: { capable: true, title: 'القِرش', statusBarStyle: 'default' },
});
}


export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

const themeScript = `(() => { try { const theme = localStorage.getItem('alqirsh-theme') || 'system'; const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); const cookie = document.cookie.split('; ').find((part) => part.startsWith('alqirsh-language='))?.split('=')[1]; const stored = localStorage.getItem('alqirsh-language'); const locale = cookie === 'en' || cookie === 'ar' ? cookie : stored === 'en' ? 'en' : 'ar'; document.documentElement.dataset.locale = locale; document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; } catch {} })();`;

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = (await cookies()).get('alqirsh-language')?.value === 'en' ? 'en' : 'ar';
  return <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning className="h-full antialiased"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className="min-h-full"><LanguageProvider initialLocale={locale}><PwaRegister />{children}<PublicAssistant /></LanguageProvider></body></html>;
}
