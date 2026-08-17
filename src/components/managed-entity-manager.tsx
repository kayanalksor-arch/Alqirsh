'use client';
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { deleteManagedEntity, saveManagedEntity } from '@/app/actions/management';

type Field = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'textarea'; required?: boolean; options?: readonly (readonly [string, string])[]; relation?: readonly [string, string] };
type Config = { table: string; title: string; singular: string; fields: readonly Field[]; display: readonly string[] };
type Row = { id: string; [key: string]: unknown };

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function ManagedEntityManager({ config }: { config: Config }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [view, setView] = useState<Row | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    const { data, error } = await createClient().from(config.table).select('*').order('created_at', { ascending: false });
    if (error) setMsg(error.message);
    else setRows((data ?? []) as Row[]);
  }

  useEffect(() => { void load(); }, [config.table]);

  const filteredRows = useMemo(() => {
    const searchText = normalizeText(query);
    return rows.filter((row) => {
      const haystack = config.fields
        .map((field) => row[field.key])
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map((value) => String(value))
        .join(' ');
      return searchText === '' || normalizeText(haystack).includes(searchText);
    });
  }, [config.fields, query, rows]);

  function open(r?: Row) {
    setEdit(r ?? null);    setEditorOpen(true);    setForm(Object.fromEntries(config.fields.map((field) => [field.key, r?.[field.key] == null ? '' : String(r[field.key])])));
  }

  function text(field: Field, value: unknown) {
    if (value == null || value === '') return '—';
    return field.options?.find((option) => option[0] === String(value))?.[1] ?? String(value);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    const missing = config.fields.filter((field) => field.required && (form[field.key] ?? '').trim() === '');
    if (missing.length) {
      setMsg(`الحقول المطلوبة ناقصة: ${missing.map((field) => field.label).join(', ')}`);
      return;
    }

    try {
      await saveManagedEntity(
        config.table,
        edit?.id ?? null,
        Object.fromEntries(config.fields.map((field) => [field.key, form[field.key] === '' ? null : field.type === 'number' ? Number(form[field.key]) : form[field.key]])),
      );
      setForm(null);
      setEditorOpen(false);
      setEdit(null);
      setMsg('تم الحفظ بنجاح.');
      void load();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'تعذر الحفظ.');
    }
  }

  return (
    <main className="p-5 lg:p-9">
      <div className="panel flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
        <label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="ابحث بالاسم أو الوصف أو التفاصيل" />
        </label>
        <button type="button" onClick={() => open()} className="rounded-xl bg-[var(--brand)] px-5 py-3 font-bold text-white">
          <Plus className="inline" /> إضافة {config.singular}
        </button>
      </div>

      {msg && <p className="mt-3 rounded-xl border border-[var(--line)] p-3">{msg}</p>}

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredRows.map((row) => (
          <article key={row.id} className="panel rounded-2xl p-5">
            {config.display.map((key) => {
              const field = config.fields.find((item) => item.key === key)!;
              return (
                <p key={key} className="flex justify-between gap-3 border-b border-[var(--line)] py-2">
                  <span className="text-xs text-[var(--muted)]">{field.label}</span>
                  <b>{text(field, row[key])}</b>
                </p>
              );
            })}

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setView(row); setViewOpen(true); }} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold">عرض</button>
              <button type="button" onClick={() => open(row)} className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-bold text-white">تعديل</button>
              <button type="button" onClick={() => { setDel(row); setDeleteOpen(true); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">حذف</button>
            </div>
          </article>
        ))}
      </section>

      {!filteredRows.length && query && (
        <section className="panel mt-5 rounded-2xl p-8 text-center">
          <h3 className="font-black">لا توجد نتائج مطابقة</h3>
          <button type="button" onClick={() => setQuery('')} className="mt-4 text-sm font-bold text-[var(--brand)]">مسح البحث</button>
        </section>
      )}

      {viewOpen && view && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
          <div className="mx-auto mt-10 w-full max-w-2xl rounded-[1.75rem] bg-[var(--surface)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">تفاصيل</p>
                <h3 className="mt-1 text-2xl font-black">{config.title}</h3>
              </div>
              <button type="button" onClick={() => { setView(null); setViewOpen(false); }} className="grid size-10 place-items-center rounded-full border border-[var(--line)]"><X size={18} /></button>
            </div>
            <dl className="mt-5 space-y-3">
              {config.fields.map((field) => (
                <div key={field.key} className="rounded-xl border border-[var(--line)] p-3">
                  <dt className="text-xs text-[var(--muted)]">{field.label}</dt>
                  <dd className="mt-2 font-bold">{text(field, view[field.key])}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {editorOpen && form && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
          <div className="mx-auto mt-10 w-full max-w-2xl rounded-[1.75rem] bg-[var(--surface)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{edit?.id ? 'تعديل' : 'إضافة'} {config.singular}</p>
                <h3 className="mt-1 text-2xl font-black">{edit?.id ? 'تحديث البيانات' : `إضافة ${config.singular}`}</h3>
              </div>
              <button type="button" onClick={() => { setEdit(null); setForm(null); setEditorOpen(false); }} className="grid size-10 place-items-center rounded-full border border-[var(--line)]"><X size={18} /></button>
            </div>

            <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
              {config.fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-2 text-sm font-bold">
                  {field.label}
                  {field.type === 'textarea' ? (
                    <textarea value={form?.[field.key] ?? ''} onChange={(event) => setForm((prev) => prev ? { ...prev, [field.key]: event.target.value } : prev)} rows={4} className="rounded-xl border border-[var(--line)] bg-transparent p-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                  ) : field.options ? (
                    <select value={form?.[field.key] ?? ''} onChange={(event) => setForm((prev) => prev ? { ...prev, [field.key]: event.target.value } : prev)} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">اختر {field.label}</option>
                      {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  ) : (
                    <input value={form?.[field.key] ?? ''} onChange={(event) => setForm((prev) => prev ? { ...prev, [field.key]: event.target.value } : prev)} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                  )}
                </label>
              ))}

              <div className="md:col-span-2 mt-2 flex justify-end gap-3">
                <button type="button" onClick={() => { setEdit(null); setForm(null); setEditorOpen(false); }} className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold">إلغاء</button>
                <button type="submit" className="rounded-xl bg-[var(--brand)] px-5 py-2.5 font-bold text-white">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteOpen && del && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4">
          <div className="mx-auto mt-10 w-full max-w-md rounded-[1.75rem] bg-[var(--surface)] p-6">
            <h3 className="text-xl font-black">حذف {config.singular}</h3>
            <p className="mt-3 text-sm text-[var(--muted)]">هل أنت متأكد من حذف هذا العنصر؟</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => { setDel(null); setDeleteOpen(false); }} className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold">إلغاء</button>
              <button type="button" onClick={async () => { await deleteManagedEntity(config.table, del.id); setDeleteOpen(false); setDel(null); void load(); }} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white">حذف</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
