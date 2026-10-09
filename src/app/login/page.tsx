'use client';

import Link from 'next/link';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) { setError('Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å  Ã™Ë†Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â± Ã™â€¦Ã˜Â·Ã™â€žÃ™Ë†Ã˜Â¨Ã˜Â§Ã™â€ .'); return; }
    setLoading(true);
    setError('');
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) { setError('Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã˜ÂºÃ™Å Ã˜Â± Ã˜ÂµÃ˜Â­Ã™Å Ã˜Â­Ã˜Â©.'); setLoading(false); return; }
    router.replace('/dashboard');
    router.refresh();
  }

  return <main className="app-shell relative grid min-h-screen place-items-center p-5"><div className="absolute left-5 top-5"><ThemeToggle /></div><section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-xl shadow-emerald-950/5 md:grid-cols-[1.05fr_.95fr]"><div className="hidden bg-[var(--brand-deep)] p-10 text-white md:block"><p className="text-sm font-bold text-emerald-200">Ã˜Â§Ã™â€žÃ™â€šÃ™ÂÃ˜Â±Ã˜Â´</p><h1 className="mt-5 text-4xl font-black leading-tight">Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â¨Ã˜Â¯Ã˜Â£ Ã™â€¦Ã™â€  Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã™Ë†Ã˜Â§Ã˜Â¶Ã˜Â­Ã˜Â©.</h1><p className="mt-5 max-w-sm leading-7 text-emerald-100">Ã˜Â³Ã˜Â¬Ã™â€˜Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž Ã™â€žÃ™â€žÃ™Ë†Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¥Ã™â€žÃ™â€° Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã™Ë†Ã˜Â¹Ã˜Â±Ã™Ë†Ã˜Â¶ Ã˜Â§Ã™â€žÃ˜Â¨Ã™Å Ã˜Â¹ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â¥Ã™Å Ã˜Â¬Ã˜Â§Ã˜Â±.</p></div><form onSubmit={submit} className="p-7 sm:p-10"><Link href="/" className="text-sm font-bold text-[var(--brand)]">Ã˜Â§Ã™â€žÃ˜Â¹Ã™Ë†Ã˜Â¯Ã˜Â© Ã˜Â¥Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹</Link><h2 className="mt-7 text-3xl font-black">Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž</h2><p className="mt-2 text-sm text-[var(--muted)]">Ã˜Â£Ã˜Â¯Ã˜Â®Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨Ã™Æ’ Ã™â€žÃ™â€žÃ™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â©.</p><label className="mt-7 block text-sm font-bold">Ã˜Â§Ã™â€žÃ˜Â¨Ã˜Â±Ã™Å Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â¥Ã™â€žÃ™Æ’Ã˜ÂªÃ˜Â±Ã™Ë†Ã™â€ Ã™Å <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 focus-within:ring-2 focus-within:ring-[var(--focus)]"><Mail size={18} className="text-[var(--muted)]" /><input required value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="w-full bg-transparent py-3 outline-none" /></div></label><label className="mt-5 block text-sm font-bold">Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±<div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 focus-within:ring-2 focus-within:ring-[var(--focus)]"><LockKeyhole size={18} className="text-[var(--muted)]" /><input required value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="w-full bg-transparent py-3 outline-none" /><button type="button" aria-label={showPassword ? 'Ã˜Â¥Ã˜Â®Ã™ÂÃ˜Â§Ã˜Â¡ Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±' : 'Ã˜Â¥Ã˜Â¸Ã™â€¡Ã˜Â§Ã˜Â± Ã™Æ’Ã™â€žÃ™â€¦Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â±Ã™Ë†Ã˜Â±'} onClick={() => setShowPassword((value) => !value)} className="grid size-10 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--canvas)]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p>}<button disabled={loading} className="mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 font-bold text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Ã˜Â¬Ã˜Â§Ã˜Â±Ã™Â Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€žÃ¢â‚¬Â¦' : 'Ã˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã˜Â®Ã™Ë†Ã™â€ž'}</button></form></section></main>;
}
