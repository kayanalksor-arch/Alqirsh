import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { localizedMetadata } from '@/lib/metadata';
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({ title: 'تسجيل الدخول', robots: { index: false, follow: false } });
}


export default function LoginLayout({ children }: { children: ReactNode }) { return children; }

