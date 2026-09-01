'use client';
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Edit3, Eye, LoaderCircle, Plus, Search, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

type FormFields = {
  name: string;
  logo_url: string;
  logo_file: File | null;
  website: string;
  description: string;
  category: string;
  status: 'active' | 'inactive';
};

const blank = (): FormFields => ({
  name: '',
  logo_url: '',
  logo_file: null,
  website: '',
  description: '',
  category: '',
  status: 'active',
});

export function PartnersManager({ partners: initialPartners }: { partners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<FormFields | null>(null);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [viewing, setViewing] = useState<Partner | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [removing, setRemoving] = useState<Partner | null>(null);

  const load = async () => {
    setLoading(true);
    const db = createClient();
    const { data, error } = await db.from('partners').select('*').order('created_at', { ascending: false });
    if (error) setMessage('تعذر تحميل الشركاء.');
    else setPartners((data ?? []) as Partner[]);
    setLoading(false);
  };

  const shown = useMemo(
    () => partners.filter((p) => !query || `${p.name} ${p.category ?? ''} ${p.description ?? ''}`.toLowerCase().includes(query.toLowerCase())),
    [partners, query],
  );

  const open = (p?: Partner) => {
    setEditing(p ?? null);
    setForm(p ? { name: p.name, logo_url: p.logo_url ?? '', logo_file: null, website: p.website ?? '', description: p.description ?? '', category: p.category ?? '', status: p.status } : blank());
    setEditorOpen(true);
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setForm((current) => (current ? { ...current, logo_file: file, logo_url: URL.createObjectURL(file) } : current));
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form?.name.trim()) {
      setMessage('اسم الشركة مطلوب.');
      return;
    }

    setSaving(true);
    const db = createClient();

    let logoUrl = form.logo_url.trim() || null;

    if (form.logo_file) {
      const extension = form.logo_file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `partners/${editing?.id ?? crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from('listing-images').upload(path, form.logo_file, {
        contentType: form.logo_file.type || 'image/png',
        upsert: true,
      });

      if (uploadError) {
        setMessage('تعذر رفع الصورة. تأكد من وجود مساحة التخزين.');
        setSaving(false);
        return;
      }

      logoUrl = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      name: form.name.trim(),
      logo_url: logoUrl,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      status: form.status,
    };

    const response = editing
      ? await db.from('partners').update(payload).eq('id', editing.id).select('*').single()
      : await db.from('partners').insert(payload).select('*').single();

    if (response.error || !response.data) {
      setMessage('تعذر حفظ الشركة.');
      setSaving(false);
      return;
    }

    setMessage('تم حفظ الشركة بنجاح.');
    setForm(null);
    setEditing(null);
    setEditorOpen(false);
    await load();
    setSaving(false);
  }

  async function remove() {
    if (!removing) return;
    setSaving(true);
    const { error } = await createClient().from('partners').delete().eq('id', removing.id);
    setMessage(error ? 'تعذر حذف الشركة.' : 'تم حذف الشركة بنجاح.');
    if (!error) {
      setRemoving(null);
      await load();
    }
    setSaving(false);
  }

  return (
    <main className="p-5 lg:p-9">
      <div className="panel flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
        <label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="ابحث باسم الشركة أو الفئة"
          />
        </label>
        <button
          type="button"
          onClick={() => open()}
          className="rounded-xl bg-[var(--brand)] px-5 py-3 font-bold text-white"
        >
          <Plus className="inline" /> إضافة شريك
        </button>
      </div>

      {message && <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm font-semibold">{message}</p>}

      {loading ? (
        <div className="panel mt-5 grid min-h-56 place-items-center rounded-2xl">
          <LoaderCircle className="animate-spin text-[var(--brand)]" />
        </div>
      ) : !shown.length ? (
        <section className="panel mt-5 rounded-2xl p-8 text-center">
          <h2 className="font-black">لا توجد شركاء حالياً</h2>
          <button
            type="button"
            onClick={() => open()}
            className="mt-5 rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-white"
          >
            إضافة شريك
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

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewing(partner);
                    setViewOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold"
                >
                  <Eye size={16} />
                  عرض
                </button>
                <button
                  type="button"
                  onClick={() => open(partner)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold"
                >
                  <Edit3 size={16} />
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => setRemoving(partner)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {viewOpen && viewing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-[1.75rem] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">تفاصيل الشريك</p>
                <h2 className="mt-1 text-2xl font-black">{viewing.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewing(null);
                  setViewOpen(false);
                }}
                className="grid size-10 place-items-center rounded-full border border-[var(--line)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[140px_1fr]">
              {viewing.logo_url && (
                <div className="grid place-items-center rounded-2xl bg-[var(--canvas)] p-3">
                  <img src={viewing.logo_url} alt={viewing.name} className="h-28 w-28 rounded-xl object-contain" />
                </div>
              )}

              <div className="space-y-3">
                {viewing.category && <p className="text-xs font-bold text-[var(--brand)]">{viewing.category}</p>}
                {viewing.website && (
                  <a href={viewing.website.startsWith('http') ? viewing.website : `https://${viewing.website}`} target="_blank" rel="noreferrer" className="block text-sm text-[var(--brand)] underline underline-offset-2">
                    {viewing.website}
                  </a>
                )}
                {viewing.description && <p className="text-sm leading-7 text-[var(--muted)]">{viewing.description}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {editorOpen && form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{editing ? 'تعديل' : 'إضافة'} شريك</p>
                <h2 className="mt-1 text-2xl font-black">{editing ? editing.name : 'شريك جديد'}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm(null);
                  setEditing(null);
                  setEditorOpen(false);
                }}
                className="grid size-10 place-items-center rounded-full border border-[var(--line)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-bold">
                  اسم الشركة
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">
                  الفئة
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">
                  صورة الشعار
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>

                {(form.logo_url || editing?.logo_url) && (
                  <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3">
                    <img src={form.logo_url || editing?.logo_url || ''} alt="معاينة الشعار" className="h-16 w-16 rounded-xl object-cover" />
                    <span className="text-sm text-[var(--muted)]">تم تجهيز صورة الشعار للرفع</span>
                  </div>
                )}

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">
                  الموقع الإلكتروني
                  <input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500"
                    dir="ltr"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">
                  الوصف
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="min-h-24 rounded-xl border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">
                  الحالة
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                    className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 font-bold text-white disabled:opacity-60"
                >
                  {saving ? 'جارٍ الحفظ…' : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm(null);
                    setEditing(null);
                    setEditorOpen(false);
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--line)] px-5 font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-[var(--surface)] p-6">
            <h3 className="text-xl font-black">حذف الشريك</h3>
            <p className="mt-3 text-sm text-[var(--muted)]">هل أنت متأكد من حذف <strong>{removing.name}</strong>؟</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoving(null)}
                className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  void remove();
                }}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-60"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
