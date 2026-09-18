'use client';
/* eslint-disable @next/next/no-img-element */

import { Building2, CalendarDays, ExternalLink, Globe, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Partner = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  category: string | null;
  status: 'active' | 'inactive';
  created_at: string | null;
};

const normalizeText = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const websiteUrl = (website: string) => website.startsWith('http') ? website : `https://${website}`;

function PartnerLogo({ partner, large = false }: { partner: Partner; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initial = partner.name.trim().slice(0, 1) || 'ش';
  const size = large ? 'h-40 w-full' : 'h-28 w-full';
  if (!partner.logo_url || failed) return <div className={`grid ${size} place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--brand)]`}><Building2 size={large ? 36 : 25} /><span className="sr-only">{initial}</span></div>;
  return <img src={partner.logo_url} alt={`شعار ${partner.name}`} onError={() => setFailed(true)} className={`${size} rounded-2xl object-contain p-4`} />;
}

export function PublicPartnerGallery({ partners }: { partners: Partner[] }) {
  const [selected, setSelected] = useState<Partner | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(() => [...new Set(partners.map((partner) => partner.category).filter(Boolean))] as string[], [partners]);
  const shown = useMemo(() => {
    const term = normalizeText(query);
    return partners.filter((partner) => (!category || partner.category === category) && (!term || normalizeText([partner.name, partner.category, partner.description, partner.website].filter(Boolean).join(' ')).includes(term)));
  }, [category, partners, query]);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [selected]);

  return <>
    <section className="partner-filter panel mt-6 grid gap-3 rounded-2xl p-3 md:grid-cols-[1fr_12rem]">
      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3"><Search size={17} className="text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="ابحث باسم الشريك أو الخدمة" /></label>
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-semibold"><option value="">كل الفئات</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
    </section>
    {shown.length === 0 ? <section className="panel mt-5 rounded-2xl p-8 text-center"><Building2 className="mx-auto text-[var(--brand)]" size={26}/><h2 className="mt-3 font-black">لا توجد نتائج مطابقة</h2><button type="button" onClick={() => { setQuery(''); setCategory(''); }} className="mt-3 text-sm font-bold text-[var(--brand)]">مسح البحث والفلاتر</button></section> :
      <section className="partner-grid mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">{shown.map((partner) => <article key={partner.id} className="partner-card panel flex h-full flex-col overflow-hidden rounded-2xl p-3 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"><div className="rounded-2xl bg-[var(--canvas)]"><PartnerLogo partner={partner} /></div><div className="flex flex-1 flex-col px-1 pb-1 pt-3">{partner.category && <p className="text-[11px] font-bold text-[var(--brand)]">{partner.category}</p>}<h2 className="mt-1 line-clamp-2 text-base font-black leading-6">{partner.name}</h2>{partner.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{partner.description}</p>}<button type="button" onClick={() => setSelected(partner)} className="mt-auto pt-3 text-right text-xs font-bold text-[var(--brand)]">مشاهدة التفاصيل</button></div></article>)}</section>}
    {selected && <div className="partner-dialog fixed inset-0 z-50 grid place-items-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-label={`تفاصيل ${selected.name}`}><button type="button" className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} aria-label="إغلاق نافذة التفاصيل"/><section className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"><header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-6"><div className="min-w-0"><p className="eyebrow">شريك نجاح</p><h2 className="mt-1 truncate text-xl font-black sm:text-2xl">{selected.name}</h2></div><button type="button" onClick={() => setSelected(null)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--canvas)]" aria-label="إغلاق"><X size={19}/></button></header><div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[13rem_1fr]"><div className="self-start rounded-2xl bg-[var(--canvas)] p-3"><PartnerLogo partner={selected} large /></div><div className="min-w-0">{selected.category && <p className="inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--brand)]">{selected.category}</p>}{selected.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{selected.description}</p> : <p className="mt-4 text-sm leading-7 text-[var(--muted)]">لا توجد نبذة إضافية متاحة لهذا الشريك.</p>}<dl className="partner-details mt-5 space-y-2 text-sm">{selected.website && <div><dt><Globe size={16}/> الموقع الإلكتروني</dt><dd><a href={websiteUrl(selected.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--brand)] hover:underline"><span dir="ltr" className="truncate">{selected.website}</span><ExternalLink size={14}/></a></dd></div>}{selected.created_at && <div><dt><CalendarDays size={16}/> تاريخ الإضافة</dt><dd>{new Date(selected.created_at).toLocaleDateString('ar-EG')}</dd></div>}</dl></div></div></section></div>}
  </>;
}
