import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { localizedMetadata } from '@/lib/metadata';
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({ robots: { index: false, follow: false, noarchive: true } });
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
