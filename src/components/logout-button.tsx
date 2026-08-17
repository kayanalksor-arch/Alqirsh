'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton(){const router=useRouter();async function logout(){await createClient().auth.signOut();router.replace('/login');router.refresh();}return <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-red-50 hover:text-red-700"><LogOut size={18}/>تسجيل الخروج</button>}
