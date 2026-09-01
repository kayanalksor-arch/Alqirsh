import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'القِرش | Alqirsh — عقارات للبيع والإيجار',
  description: 'منصة القِرش العقارية لعرض وإدارة العقارات.',
  manifest: '/manifest.webmanifest',
  applicationName: 'القِرش',
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
  return <html lang="ar" dir="rtl" suppressHydrationWarning className="h-full antialiased"><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className="min-h-full">{children}</body></html>;
}
