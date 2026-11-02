import { AuthForm } from '@/components/auth-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string | string[] }> }) {
  const query = await searchParams;
  return <AuthForm mode="login" notice={typeof query.reason === 'string' ? query.reason : undefined} />;
}
