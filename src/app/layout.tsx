import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  metadataBase: new URL('https://alqirsh.online'),
  title: { default: 'القِرش | عقارات وسيارات', template: '%s | القِرش' },
  description: 'منصة القِرش للعقارات والسيارات للبيع والإيجار.',
  keywords: ['عقارات', 'سيارات', 'بيع', 'إيجار', 'القِرش'],
  openGraph: { type: 'website', locale: 'ar_EG', siteName: 'القِرش', title: 'القِرش | عقارات وسيارات', description: 'منصة القِرش للعقارات والسيارات للبيع والإيجار.' },
  twitter: { card: 'summary_large_image' },
  manifest: '/manifest.webmanifest',
  applicationName: 'القِرش',
  icons: {
    icon: [
      { url: '/brand/alqirsh-icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/alqirsh-icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/brand/alqirsh-icon-192.png', type: 'image/png', sizes: '192x192' }],
  },
  appleWebApp: {
    capable: true,
    title: 'القِرش',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const themeScript = `(() => { try { const theme = localStorage.getItem('alqirsh-theme') || 'system'; const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); } catch {} })();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="ar" dir="rtl" suppressHydrationWarning className="h-full antialiased"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className="min-h-full"><PwaRegister />{children}</body></html>;
}
