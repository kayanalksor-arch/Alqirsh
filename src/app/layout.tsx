import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'القِرش | Alqirsh — عقارات وسيارات',
  description: 'منصة القِرش للعقارات والسيارات للبيع والإيجار.',
  manifest: '/manifest.webmanifest',
  applicationName: 'القِرش',
  icons: {
    icon: [{ url: '/brand/alqirsh-icon.png', type: 'image/png', sizes: '139x147' }],
    apple: [{ url: '/brand/alqirsh-icon.png', type: 'image/png', sizes: '139x147' }],
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
