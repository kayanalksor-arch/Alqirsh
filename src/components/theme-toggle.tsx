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
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('alqirsh-theme');
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setTheme(saved);
        applyTheme(saved);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'system' ? 'المظهر التلقائي' : theme === 'light' ? 'المظهر الفاتح' : 'المظهر الداكن';

  return <button type="button" onClick={() => { setTheme(next); applyTheme(next); }} title={`${label} — اضغط للتبديل`} aria-label={`${label} — اضغط للتبديل`} className="group relative grid size-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] shadow-[0_8px_24px_rgba(8,35,28,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"><Icon size={18} strokeWidth={2.2} /><span className="absolute bottom-1.5 right-1.5 size-2 rounded-full border-2 border-[var(--surface-raised)] bg-[var(--primary)] transition group-hover:bg-[var(--primary-foreground)]" aria-hidden="true" /></button>;
}
