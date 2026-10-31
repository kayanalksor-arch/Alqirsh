'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/components/language-provider';

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const [busy, setBusy] = useState(false);
  async function logout() {
    if (busy) return;
    setBusy(true);
    try { const response = await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); if (!response.ok) await createClient().auth.signOut(); } catch { await createClient().auth.signOut(); }
    finally { router.replace('/login?reason=signedout'); router.refresh(); }
  }
  return <button disabled={busy} onClick={logout} title={compact ? (locale === 'en' ? 'Sign out' : '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c') : undefined} aria-label={locale === 'en' ? 'Sign out' : '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c'} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60 ${compact ? 'px-0' : ''}`}><LogOut size={18}/>{!compact && (busy ? (locale === 'en' ? 'Signing out…' : '\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c\u2026') : t('\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c'))}</button>;
}
