'use client';

import { Globe, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

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

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function PublicPartnerGallery({ partners }: { partners: Partner[] }) {
  const [selected, setSelected] = useState<Partner | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(
    () => [...new Set(partners.map((partner) => partner.category).filter(Boolean))] as string[],
    [partners],
  );

  const shown = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return partners.filter((partner) => {
      const matchesCategory = !category || partner.category === category;
      const haystack = [partner.name, partner.category, partner.description, partner.website].filter(Boolean).join(' ');
      return matchesCategory && (normalizedQuery === '' || normalizeText(haystack).includes(normalizedQuery));
    });
  }, [category, partners, query]);

  return (
    <>
      <section className="panel mt-8 grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px]">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="ابحث باسم الشريك أو الفئة أو الوصف"
          />
        </label>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
        >
          <option value="">كل الفئات</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </section>

      {shown.length === 0 ? (
        <section className="panel mt-5 rounded-2xl p-10 text-center">
          <h2 className="font-black">لا توجد نتائج مطابقة</h2>
          <button type="button" onClick={() => { setQuery(''); setCategory(''); }} className="mt-4 text-sm font-bold text-[var(--brand)]">
            مسح البحث والفلتر
          </button>
        </section>
      ) : (
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((partner) => (
            <article key={partner.id} className="panel group flex h-full flex-col rounded-2xl p-5 transition hover:-translate-y-1 hover:border-[var(--brand)]">
              <div className="mb-4 grid h-28 place-items-center overflow-hidden rounded-2xl bg-[var(--canvas)] p-3">
                {partner.logo_url ? (
                  <img src={partner.logo_url} alt={partner.name} className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--surface)] text-lg font-black text-[var(--brand)] shadow-sm">
                    {partner.name.slice(0, 1)}
                  </div>
                )}
              </div>

              <div className="flex-1">
                {partner.category && <p className="text-[10px] font-bold text-[var(--brand)] sm:text-xs">{partner.category}</p>}
                <h2 className="mt-2 text-lg font-black">{partner.name}</h2>
                {partner.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{partner.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelected(partner)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"
              >
                عرض التفاصيل
              </button>
            </article>
          ))}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--surface)] shadow-2xl">
            <button type="button" onClick={() => setSelected(null)} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/20 text-white" aria-label="إغلاق">
              <X size={18} />
            </button>

            <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr] md:p-8">
              <div className="grid place-items-center rounded-2xl bg-[var(--canvas)] p-4">
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt={selected.name} className="max-h-40 max-w-full object-contain" />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--surface)] text-3xl font-black text-[var(--brand)]">
                    {selected.name.slice(0, 1)}
                  </div>
                )}
              </div>

              <div>
                {selected.category && <p className="text-xs font-bold text-[var(--brand)]">{selected.category}</p>}
                <h2 className="mt-2 text-2xl font-black">{selected.name}</h2>

                {selected.description && <p className="mt-5 leading-7 text-[var(--muted)]">{selected.description}</p>}

                <div className="mt-6 space-y-3 text-sm">
                  {selected.website && (
                    <a
                      href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[var(--brand)] underline-offset-4 hover:underline"
                    >
                      <Globe size={16} />
                      {selected.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
