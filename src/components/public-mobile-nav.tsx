'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

type PublicLink = readonly [string, string];

export function PublicMobileNav({ links, authenticated }: { links: readonly PublicLink[]; authenticated: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] sm:hidden"
        aria-label="فتح قائمة الموقع"
        aria-expanded={open}
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="قائمة الموقع">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45"
            aria-label="إغلاق قائمة الموقع"
          />
          <aside className="relative mr-auto flex h-full w-[min(19rem,88vw)] flex-col overflow-y-auto bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-5">
              <strong>القِرش</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-xl border border-[var(--line)]"
                aria-label="إغلاق قائمة الموقع"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav className="mt-5 grid gap-1" aria-label="قائمة الموقع">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--canvas)] hover:text-[var(--brand)]"
                >
                  {label}
                </Link>
              ))}
              <Link
                href={authenticated ? '/dashboard' : '/login'}
                onClick={() => setOpen(false)}
                className="mt-3 rounded-xl bg-[var(--brand)] px-3 py-3 text-center text-sm font-bold text-white"
              >
                {authenticated ? 'لوحة التحكم' : 'تسجيل الدخول'}
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
