import type { ReactNode } from 'react';
import Link from 'next/link';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';

export type InfoSection = { title: string; content: ReactNode };

export function PublicInfoPage({
  eyebrow = 'معلومات المنصة', title, intro, sections, updatedAt, children,
}: {
  eyebrow?: string; title: string; intro: string; sections?: InfoSection[];
  updatedAt?: string; children?: ReactNode;
}) {
  return <main className="app-shell min-h-screen"><PublicHeader />
    <section className="page-container page-container--narrow">
      <header className="panel overflow-hidden rounded-3xl p-6 sm:p-9">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--muted)] sm:text-base">{intro}</p>
        {updatedAt && <p className="mt-4 text-xs text-[var(--muted)]">آخر تحديث: {updatedAt}</p>}
      </header>
      {children}
      {sections?.length ? <div className="mt-6 grid gap-4">{sections.map((section) =>
        <section key={section.title} className="panel rounded-2xl p-5 sm:p-7">
          <h2 className="text-xl font-black">{section.title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-8 text-[var(--muted)]">{section.content}</div>
        </section>)}</div> : null}
      <nav aria-label="روابط ذات صلة" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-[var(--brand)]">
        <Link href="/contact">تواصل معنا</Link><Link href="/faq">الأسئلة الشائعة</Link>
        <Link href="/properties">تصفح العقارات</Link><Link href="/cars">تصفح السيارات</Link>
      </nav>
    </section><PublicFooter /></main>;
}

export function InfoList({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-2 pe-6">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}
