import { AuthForm } from '@/components/auth-form';
import type { Metadata } from 'next';
import { localizedMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({ title: 'إنشاء حساب', robots: { index: false, follow: false, noarchive: true } });
}

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
