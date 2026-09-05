'use client';
/* eslint-disable @next/next/no-img-element */

import { Download, Edit3, ImagePlus, LoaderCircle, Plus, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addBrandWatermark } from '@/lib/image-watermark';
import { listingStatusClass, listingStatusLabel, listingStatusesForType } from '@/lib/listings';

type Offer = {
  id: string;
  title: string;
  description: string | null;
  property_type: string | null;
  price: number | null;
  location: string | null;
  address: string | null;
  map_url: string | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  facade: string | null;
  status: string;
};

type FormFields = {
  title: string;
  description: string;
  property_type: string;
  price: string;
  location: string;
  address: string;
  map_url: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  facade: string;
  status: string;
  image_files: File[];
};

const blank = (): FormFields => ({ title: '', description: '', property_type: '', price: '', location: '', address: '', map_url: '', area: '', bedrooms: '', bathrooms: '', facade: '', status: 'pending_review', image_files: [] });

async function ensureManagerProfile(db: ReturnType<typeof createClient>) {
  const { data: { user }, error: userError } = await db.auth.getUser();
  if (userError || !user) throw new Error('يجب تسجيل الدخول أولاً.');

  const { data: canManage, error: permissionError } = await db.rpc('is_platform_manager');
  if (permissionError) throw permissionError;
  if (!canManage) throw new Error('لا توجد صلاحية كافية لإدارة العروض.');

  return { user, role: 'property_manager' };
}

export function OfferManager({ kind }: { kind: 'sale' | 'rental' }) {
  const table = kind === 'sale' ? 'sale_offers' : 'rental_offers';
  const entity = kind === 'sale' ? 'عرض بيع' : 'عرض إيجار';
  const [offers, setOffers] = useState<Offer[]>([]);
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<FormFields | null>(null);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [viewing, setViewing] = useState<Offer | null>(null);
  const [removing, setRemoving] = useState<Offer | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const db = createClient();
    try {
      const { role } = await ensureManagerProfile(db);
      if (!['admin', 'property_manager'].includes(role)) {
        setMessage('لا توجد صلاحية كافية لعرض هذه العروض.');
        setOffers([]);
        setLoading(false);
        return;
      }

      const [{ data, error }, { data: media }] = await Promise.all([
        db.from(table).select('id,title,description,property_type,price,location,address,map_url,area,bedrooms,bathrooms,facade,status').order('created_at', { ascending: false }),
        db.from('property_images').select('property_id,image_url,image_path,sort_order').eq('property_type', kind).order('sort_order'),
      ]);

      if (error) {
        setMessage('تعذر تحميل العروض. تحقق من الصلاحيات.');
        setOffers([]);
      } else {
        setMessage('');
        setOffers((data ?? []) as Offer[]);
      }

      const next: Record<string, string[]> = {};
      for (const image of media ?? []) {
        const imageUrl = image.image_url || db.storage.from('listing-images').getPublicUrl(image.image_path).data.publicUrl;
        next[image.property_id] = [...(next[image.property_id] ?? []), imageUrl];
      }
      setImages(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحميل العروض. تحقق من الصلاحيات.');
      setOffers([]);
    }
    setLoading(false);
  }, [kind, table]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const locations = useMemo(() => [...new Set(offers.map((offer) => offer.location).filter(Boolean))] as string[], [offers]);
  const statuses = listingStatusesForType(kind === 'rental' ? 'rent' : 'sale');
  const normalizeText = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const formatNumber = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

  const shown = useMemo(
    () =>
      offers.filter((offer) => {
        const matchesText = normalizeText(`${offer.title} ${offer.location ?? ''} ${offer.address ?? ''} ${offer.property_type ?? ''} ${offer.description ?? ''}`).includes(normalizeText(query));
        const matchesLocation = !location || offer.location === location;
        const matchesStatus = !statusFilter || offer.status === statusFilter;
        return matchesText && matchesLocation && matchesStatus;
      }),
    [location, offers, query, statusFilter],
  );

  const value = (input: string) => (input === '' ? null : Number(input));

  const open = (offer?: Offer) => {
    setEditing(offer ?? null);
    setPendingFiles([]);
    setForm(
      offer ? {
        title: offer.title,
        description: offer.description ?? '',
        property_type: offer.property_type ?? '',
        price: String(offer.price ?? ''),
        location: offer.location ?? '',
        address: offer.address ?? '',
        map_url: offer.map_url ?? '',
        area: String(offer.area ?? ''),
        bedrooms: String(offer.bedrooms ?? ''),
        bathrooms: String(offer.bathrooms ?? ''),
        facade: offer.facade ?? '',
        status: offer.status,
        image_files: [],
      } : blank(),
    );
  };

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setPendingFiles((previous) => [...previous, ...files]);
    setForm((current) => current ? { ...current, image_files: [...(current.image_files ?? []), ...files] } : current);
  }

  function removeImage(index: number) {
    setPendingFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setForm((current) => current ? { ...current, image_files: (current.image_files ?? []).filter((_, itemIndex) => itemIndex !== index) } : current);
  }

  async function uploadFiles(db: ReturnType<typeof createClient>, offerId: string) {
    for (let index = 0; index < pendingFiles.length; index += 1) {
      const file = await addBrandWatermark(pendingFiles[index]);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${kind}/${offerId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from('listing-images').upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const imageUrl = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
      const { error: imageError } = await db.from('property_images').insert({ property_type: kind, property_id: offerId, image_path: path, image_url: imageUrl, sort_order: index });
      if (imageError) throw imageError;
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form?.title.trim()) { setMessage('عنوان العرض مطلوب.'); return; }

    const mapUrl = form.map_url.trim();
    if (mapUrl) {
      try {
        const parsed = new URL(mapUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setMessage('أدخل رابط خريطة صحيحاً يبدأ بـ https:// أو http://');
        return;
      }
    }

    setSaving(true);
    const db = createClient();
    try {
      const { user, role } = await ensureManagerProfile(db);
      if (!['admin', 'property_manager'].includes(role)) {
        setMessage('ليس لديك صلاحية حفظ العروض.');
        setSaving(false);
        return;
      }

      const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      property_type: form.property_type.trim() || null,
      price: value(form.price),
      location: form.location.trim() || null,
      address: form.address.trim() || null,
      map_url: mapUrl || null,
      area: value(form.area),
      bedrooms: value(form.bedrooms),
      bathrooms: value(form.bathrooms),
      facade: form.facade.trim() || null,
      status: form.status,
    };

      const response = editing
        ? await db.from(table).update(payload).eq('id', editing.id).select('id').single()
        : await db.from(table).insert({ ...payload, created_by: user.id }).select('id').single();

      if (response.error || !response.data) {
        setMessage('تعذر حفظ العرض. تحقق من البيانات والصلاحيات.');
        setSaving(false);
        return;
      }

      try {
        await uploadFiles(db, response.data.id);
        setMessage('تم حفظ العرض والصور بنجاح.');
        setForm(null);
        setEditing(null);
        await load();
      } catch {
        setMessage('تم حفظ العرض، لكن تعذر رفع بعض الصور.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ العرض. تحقق من البيانات والصلاحيات.');
    }
    setSaving(false);
  }

  async function remove() {
    if (!removing) return;
    setSaving(true);
    try {
      const db = createClient();
      const { role } = await ensureManagerProfile(db);
      if (!['admin', 'property_manager'].includes(role)) {
        setMessage('ليس لديك صلاحية حذف العروض.');
        setSaving(false);
        return;
      }

      const { error } = await db.from(table).delete().eq('id', removing.id);
      setMessage(error ? 'تعذر حذف العرض.' : 'تم حذف العرض بنجاح.');
      if (!error) {
        setRemoving(null);
        await load();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حذف العرض.');
    }
    setSaving(false);
  }

  return (
    <main className="dashboard-content">
      <div className="dashboard-controls panel rounded-2xl p-4">
        <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="ابحث بالعنوان أو الموقع أو النوع" />
        </label>

        <select value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold">
          <option value="">كل المناطق</option>
          {locations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold">
          <option value="">كل الحالات</option>
          {statuses.map((item) => <option key={item} value={item}>{listingStatusLabel(item, kind === 'rental' ? 'rent' : 'sale')}</option>)}
        </select>

        <button type="button" onClick={() => open()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 font-bold text-white">
          <Plus size={18} />إضافة {entity}
        </button>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm font-semibold">{message}</p>}

      {loading ? (
        <div className="panel mt-5 grid min-h-56 place-items-center rounded-2xl"><LoaderCircle className="animate-spin text-[var(--brand)]" /></div>
      ) : !shown.length ? (
        <section className="panel mt-5 rounded-2xl p-8 text-center">
          <h2 className="font-black">لا توجد عروض حالياً</h2>
          <button type="button" onClick={() => open()} className="mt-5 rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-white">إضافة {entity}</button>
        </section>
      ) : (
        <section className="offer-manager-grid mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {shown.map((offer) => (
            <article key={offer.id} className="panel flex h-full flex-col overflow-hidden rounded-2xl">
              <div className="grid h-40 place-items-center bg-[var(--canvas)]">
                {images[offer.id]?.[0] ? <img src={images[offer.id][0]} alt={offer.title} className="h-full w-full object-cover" /> : <ImagePlus className="text-[var(--subtle)]" size={28} />}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <span className={`status-badge ${listingStatusClass(offer.status)}`}>{listingStatusLabel(offer.status, kind === 'rental' ? 'rent' : 'sale')}</span>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <h2 className="flex-1 font-black">{offer.title}</h2>
                  <strong className="shrink-0 text-[var(--brand)]">{formatNumber(offer.price)} ج.م</strong>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{offer.location ?? 'الموقع غير محدد'} · {offer.property_type ?? 'نوع غير محدد'}</p>
                <div className="mt-auto flex justify-between gap-2 pt-4">
                  <button type="button" onClick={() => setViewing(offer)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold">عرض</button>
                  <button type="button" onClick={() => open(offer)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-bold"><Edit3 size={16} />تعديل</button>
                  <button type="button" onClick={() => setRemoving(offer)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={16} />حذف</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {form && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-2 sm:p-4">
          <div className="mx-auto grid min-h-full w-full max-w-3xl place-items-center py-2 sm:py-4">
            <div className="modal-frame rounded-[1.5rem] bg-[var(--surface)] p-4 shadow-2xl sm:rounded-[1.75rem] sm:p-5">
              <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{editing ? 'تعديل' : 'إضافة'} {entity}</p>
                <h2 className="mt-1 text-2xl font-black">{editing ? editing.title : `عرض ${entity}`}</h2>
              </div>
              <button type="button" onClick={() => { setForm(null); setEditing(null); }} className="grid size-10 place-items-center rounded-full border border-[var(--line)]"><X size={18} /></button>
            </div>

            <form onSubmit={save} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-bold">العنوان
                  <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">نوع العقار
                  <input value={form.property_type} onChange={(event) => setForm({ ...form, property_type: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">السعر
                  <input dir="ltr" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">الموقع
                  <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">العنوان التفصيلي
                  <textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="min-h-24 rounded-xl border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">رابط خريطة الموقع (اختياري)
                  <input dir="ltr" value={form.map_url} onChange={(event) => setForm({ ...form, map_url: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="https://maps.google.com/..." />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">المساحة
                  <input dir="ltr" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">غرف النوم
                  <input dir="ltr" value={form.bedrooms} onChange={(event) => setForm({ ...form, bedrooms: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">دورات المياه
                  <input dir="ltr" value={form.bathrooms} onChange={(event) => setForm({ ...form, bathrooms: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">واجهة العرض
                  <input value={form.facade} onChange={(event) => setForm({ ...form, facade: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="مثال: شارع رئيسي، بحر، حديقة" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold">الحالة
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 outline-none focus:ring-2 focus:ring-emerald-500">
                    {statuses.map((status) => <option key={status} value={status}>{listingStatusLabel(status, kind === 'rental' ? 'rent' : 'sale')}</option>)}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">الوصف
                  <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-28 rounded-xl border border-[var(--line)] bg-transparent px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>

                <label className="flex flex-col gap-2 text-sm font-bold md:col-span-2">صور العرض
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="min-h-11 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                  <p className="text-xs text-[var(--muted)]">يمكنك إضافة عدة صور. سيتم رفع جميع الصور المختارة.</p>
                </label>

                {form.image_files && form.image_files.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="mb-3 text-sm font-bold">الصور المختارة:</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {form.image_files.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="relative flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3">
                          <div className="h-12 w-12 overflow-hidden rounded-lg">
                            <img src={URL.createObjectURL(file)} alt={`معاينة ${index + 1}`} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{file.name}</p>
                            <p className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                          <button type="button" onClick={() => removeImage(index)} className="text-red-600 hover:text-red-700">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 font-bold text-white disabled:opacity-60">{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
                <button type="button" onClick={() => { setForm(null); setEditing(null); }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--line)] px-5 font-bold">إلغاء</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-2 sm:p-4">
          <div className="mx-auto grid min-h-full w-full max-w-2xl place-items-center py-2 sm:py-4">
            <div className="max-h-[82vh] w-full overflow-y-auto rounded-[1.5rem] bg-[var(--surface)] p-4 sm:max-h-[90vh] sm:rounded-[1.75rem] sm:p-6">
              <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">تفاصيل العرض</p>
                <h3 className="mt-1 text-2xl font-black">{viewing.title}</h3>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="grid size-10 place-items-center rounded-full border border-[var(--line)]"><X size={18} /></button>
            </div>

            {images[viewing.id]?.length ? (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images[viewing.id].map((src, index) => (
                  <button key={src + index} type="button" onClick={() => setFullImage(src)} className="h-36 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--canvas)] sm:h-44" aria-label={`فتح صورة العرض ${index + 1} بالحجم الكامل`}>
                    <img src={src} alt={`${viewing.title} ${index + 1}`} className="h-full w-full object-cover transition hover:scale-105" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 grid h-36 place-items-center rounded-xl bg-[var(--canvas)] text-sm text-[var(--muted)]">لا توجد صور</div>
            )}

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">الحالة</p>
                <p className="mt-2 font-bold">{viewing.status}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">السعر</p>
                <p className="mt-2 font-bold">{formatNumber(viewing.price)} ج.م</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">الموقع</p>
                <p className="mt-2 font-bold">{viewing.location ?? 'غير محدد'}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">العنوان التفصيلي</p>
                <p className="mt-2 font-bold">{viewing.address ?? 'غير محدد'}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">نوع العقار</p>
                <p className="mt-2 font-bold">{viewing.property_type ?? 'غير محدد'}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">المساحة</p>
                <p className="mt-2 font-bold">{formatNumber(viewing.area)} م²</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">غرف النوم / الحمامات</p>
                <p className="mt-2 font-bold">{formatNumber(viewing.bedrooms)} / {formatNumber(viewing.bathrooms)}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">واجهة العرض</p>
                <p className="mt-2 font-bold">{viewing.facade ?? 'غير محددة'}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-3">
                <p className="text-xs text-[var(--muted)]">الوصف</p>
                <p className="mt-2 whitespace-pre-line font-bold">{viewing.description || 'لا يوجد وصف.'}</p>
              </div>
              {viewing.map_url && (
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <p className="text-xs text-[var(--muted)]">رابط الخريطة</p>
                  <a href={viewing.map_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all font-bold text-[var(--brand)] underline">
                    {viewing.map_url}
                  </a>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {fullImage && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="معاينة الصورة بالحجم الكامل">
          <button type="button" onClick={() => setFullImage(null)} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label="إغلاق الصورة">
            <X size={20} />
          </button>
          <img src={fullImage} alt="صورة العرض بالحجم الكامل" className="max-h-[82vh] max-w-full object-contain" />
          <a href={fullImage} download className="absolute bottom-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-900">
            <Download size={17} /> تنزيل الصورة
          </a>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-[var(--surface)] p-6">
            <h3 className="text-xl font-black">حذف العرض</h3>
            <p className="mt-3 text-sm text-[var(--muted)]">هل أنت متأكد من حذف <strong>{removing.title}</strong>؟</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setRemoving(null)} className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold">إلغاء</button>
              <button type="button" onClick={() => { void remove(); }} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-60">حذف</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
