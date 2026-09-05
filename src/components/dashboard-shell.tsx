'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Building2, CarFront, ClipboardList, LayoutDashboard, Menu, Settings, UserRound, Users, Wrench, X } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';

const links = [
  ['/dashboard', 'لوحة التحكم', LayoutDashboard],
  ['/dashboard/properties', 'العقارات', Building2],
  ['/dashboard/cars', 'السيارات', CarFront],
  ['/dashboard/property-management', 'إدارة الأملاك', Wrench],
  ['/dashboard/requests', 'الطلبات', ClipboardList],
  ['/dashboard/users', 'المستخدمون', Users],
  ['/dashboard/partners', 'شركاء النجاح', Users],
  ['/dashboard/settings', 'الإعدادات', Settings],
  ['/dashboard/profile', 'الملف الشخصي', UserRound],
] as const;

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return <nav className="mt-6 space-y-1" aria-label="التنقل داخل لوحة التحكم">{links.map(([href, label, Icon]) => {
    const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
    const className = active ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200' : 'text-[var(--muted)] hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100';
    return <Link key={href} href={href} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${className}`}><Icon size={18} aria-hidden="true" />{label}</Link>;
  })}</nav>;
}

function Brand() {
  return <Link href="/dashboard" className="flex items-center gap-3 border-b border-[var(--line)] pb-6"><Image src="/brand/alqirsh-logo.png" alt="شعار القِرش" width={44} height={44} className="size-11 rounded-xl object-cover shadow-sm" priority /><span><b className="block">القِرش</b><small className="text-[var(--muted)]">إدارة العقارات</small></span></Link>;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return <><Brand /><Navigation onNavigate={onNavigate} /><div className="mt-8 space-y-2 border-t border-[var(--line)] pt-5"><Link href="/" onClick={onNavigate} className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--line)] px-3 py-3 text-sm font-semibold transition hover:bg-[var(--canvas)]">عرض الموقع</Link><LogoutButton /></div></>;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  return <div className="app-shell flex min-h-screen"><aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-l border-[var(--line)] bg-[var(--surface)] p-5 lg:block"><SidebarContent /></aside><div className="relative min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-3 sm:px-4 lg:absolute lg:left-6 lg:top-5 lg:z-30 lg:h-auto lg:border-0 lg:bg-transparent lg:p-0"><button type="button" aria-label="فتح القائمة" onClick={() => setOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] lg:hidden"><Menu size={20} /></button><b className="min-w-0 truncate px-2 lg:hidden">القِرش</b><div className="mr-auto shrink-0"><ThemeToggle /></div></header><section className="min-w-0 flex-1">{children}</section></div>{open && <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="قائمة لوحة التحكم"><button type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45" /><aside className="relative mr-auto h-full w-[min(19rem,88vw)] overflow-y-auto bg-[var(--surface)] p-5 shadow-2xl"><button type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="absolute left-4 top-4 grid size-11 place-items-center rounded-xl border border-[var(--line)]"><X size={20} /></button><SidebarContent onNavigate={() => setOpen(false)} /></aside></div>}</div>;
}
