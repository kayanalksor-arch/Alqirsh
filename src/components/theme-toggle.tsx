'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';
const order: Theme[] = ['system', 'light', 'dark'];

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && prefersDark));
  localStorage.setItem('alqirsh-theme', theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const saved = localStorage.getItem('alqirsh-theme');
    if (saved === 'system' || saved === 'light' || saved === 'dark') {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'system' ? 'المظهر التلقائي' : theme === 'light' ? 'المظهر الفاتح' : 'المظهر الداكن';

  return <button type="button" onClick={() => { setTheme(next); applyTheme(next); }} title={`${label} — اضغط للتبديل`} aria-label={`${label} — اضغط للتبديل`} className="group relative grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink)] shadow-[0_8px_24px_rgba(8,35,28,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"><Icon size={18} strokeWidth={2.2} /><span className="absolute bottom-1.5 right-1.5 size-2 rounded-full border-2 border-[var(--surface-raised)] bg-[var(--brand)] transition group-hover:bg-white" aria-hidden="true" /></button>;
}
