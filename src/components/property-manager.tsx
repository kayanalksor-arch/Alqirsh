'use client';
/* eslint-disable @next/next/no-img-element */

import { Download, Edit3, ImagePlus, LoaderCircle, Plus, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addBrandWatermark } from '@/lib/image-watermark';
import { formatEgp } from '@/lib/listings';

type Property = {
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
  kind: 'sale' | 'rental';
};

type PropertyKind = 'sale' | 'rental';

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
  kind: PropertyKind;
  image_files: File[];
};

const blank = (): FormFields => ({
  title: '',
  description: '',
  property_type: '',
  price: '',
  location: '',
  address: '',
  map_url: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  facade: '',
  status: 'draft',
  kind: 'sale',
  image_files: [],
});

async function ensureManagerProfile(db: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error: userError,
  } = await db.auth.getUser();
  if (userError || !user) throw new Error('يجب تسجيل الدخول أولاً.');

  const { data: canManage, error: permissionError } = await db.rpc('is_platform_manager');
  if (permissionError) throw permissionError;
  if (!canManage) throw new Error('لا توجد صلاحية كافية لإدارة العقارات.');

  return { user, role: 'property_manager' };
}

export function PropertyManager() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | 'sale' | 'rental'>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<FormFields | null>(null);
  const [editing, setEditing] = useState<Property | null>(null);
  const [viewing, setViewing] = useState<Property | null>(null);
  const [removing, setRemoving] = useState<Property | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const db = createClient();
    try {
      const { role } = await ensureManagerProfile(db);
      if (!['admin', 'property_manager'].includes(role)) {
        setMessage('لا توجد صلاحية كافية لعرض هذه العقارات.');
        setProperties([]);
        setLoading(false);
        return;
      }

      // Load sale properties
      const [{ data: saleData, error: saleError }, { data: rentalData, error: rentalError }] =
        await Promise.all([
          db
            .from('sale_offers')
            .select(
              'id,title,description,property_type,price,location,address,map_url,area,bedrooms,bathrooms,facade,status'
            )
            .order('created_at', { ascending: false }),
          db
            .from('rental_offers')
            .select(
              'id,title,description,property_type,price,location,address,map_url,area,bedrooms,bathrooms,facade,status'
            )
            .order('created_at', { ascending: false }),
        ]);

      if (saleError || rentalError) {
        setMessage('تعذر تحميل العقارات. تحقق من الصلاحيات.');
        setProperties([]);
      } else {
        setMessage('');
        const allProperties: Property[] = [
          ...((saleData ?? []) as Omit<Property, 'kind'>[]).map((p) => ({
            ...p,
            kind: 'sale' as const,
          })),
          ...((rentalData ?? []) as Omit<Property, 'kind'>[]).map((p) => ({
            ...p,
            kind: 'rental' as const,
          })),
        ];
        setProperties(allProperties);
      }

      // Load images for sale properties
      const { data: saleMedia } = await db
        .from('property_images')
        .select('property_id,image_url,image_path,sort_order')
        .eq('property_type', 'sale')
        .order('sort_order');

      // Load images for rental properties
      const { data: rentalMedia } = await db
        .from('property_images')
        .select('property_id,image_url,image_path,sort_order')
        .eq('property_type', 'rental')
        .order('sort_order');

      const next: Record<string, string[]> = {};
      for (const image of [...(saleMedia ?? []), ...(rentalMedia ?? [])]) {
        const imageUrl =
          image.image_url ||
          db.storage.from('listing-images').getPublicUrl(image.image_path).data.publicUrl;
        next[image.property_id] = [...(next[image.property_id] ?? []), imageUrl];
      }
      setImages(next);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'حدث خطأ أثناء التحميل.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const locations = useMemo(
    () => [...new Set(properties.map((p) => p.location).filter(Boolean))] as string[],
    [properties]
  );

  const shown = useMemo(
    () =>
      properties.filter((p) => {
        const matchesLocation = !location || p.location === location;
        const matchesKind = !kindFilter || p.kind === kindFilter;
        const matchesStatus = !statusFilter || p.status === statusFilter;
        const haystack = [p.title, p.location, p.address, p.property_type, p.description]
          .filter(Boolean)
          .join(' ');
        const normalizedQuery = query.toLowerCase();
        const normalizedHaystack = haystack.toLowerCase();
        return (
          matchesLocation &&
          matchesKind &&
          matchesStatus &&
          (normalizedQuery === '' || normalizedHaystack.includes(normalizedQuery))
        );
      }),
    [location, kindFilter, statusFilter, properties, query]
  );

  const openForm = (p?: Property) => {
    if (p) {
      setForm({
        title: p.title,
        description: p.description || '',
        property_type: p.property_type || '',
        price: String(p.price || ''),
        location: p.location || '',
        address: p.address || '',
        map_url: p.map_url || '',
        area: String(p.area || ''),
        bedrooms: String(p.bedrooms || ''),
        bathrooms: String(p.bathrooms || ''),
        facade: p.facade || '',
        status: p.status,
        kind: p.kind,
        image_files: [],
      });
      setEditing(p);
    } else {
      setForm(blank());
      setEditing(null);
    }
  };

  const closeForm = () => {
    setForm(null);
    setEditing(null);
  };

  const handleImageAdd = (files: FileList | null) => {
    if (!files) return;
    if (form) setForm({ ...form, image_files: [...form.image_files, ...Array.from(files)] });
  };

  const removeImage = (index: number) => {
    if (form)
      setForm({
        ...form,
        image_files: form.image_files.filter((_, i) => i !== index),
      });
  };

  const submitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form) return;

    setSaving(true);
    const db = createClient();

    try {
      const { user } = await ensureManagerProfile(db);

      const table = form.kind === 'sale' ? 'sale_offers' : 'rental_offers';
      const payload = {
        title: form.title,
        description: form.description,
        property_type: form.property_type,
        price: form.price ? Number(form.price) : null,
        location: form.location,
        address: form.address,
        map_url: form.map_url,
        area: form.area ? Number(form.area) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        facade: form.facade,
        status: form.status,
        created_by: user.id,
      };

      let propertyId = editing?.id;

      if (editing) {
        const { error } = await db.from(table).update(payload).eq('id', propertyId);
        if (error) throw error;
        setMessage('تم تحديث العقار بنجاح.');
      } else {
        const { data, error } = await db.from(table).insert([payload]).select('id');
        if (error) throw error;
        propertyId = data?.[0]?.id;
        setMessage('تم إنشاء العقار بنجاح.');
      }

      // Upload images
      for (const sourceFile of form.image_files) {
        const file = await addBrandWatermark(sourceFile);
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `properties/${form.kind}/${propertyId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await db.storage
          .from('listing-images')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const imageUrl = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
        const { error: imageError } = await db.from('property_images').insert({
          property_type: form.kind,
          property_id: propertyId,
          image_path: path,
          image_url: imageUrl,
          sort_order: form.image_files.indexOf(sourceFile),
        });
        if (imageError) throw imageError;
      }

      closeForm();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProperty = async () => {
    if (!removing) return;

    setSaving(true);
    const db = createClient();

    try {
      await ensureManagerProfile(db);
      const table = removing.kind === 'sale' ? 'sale_offers' : 'rental_offers';
      const { error } = await db.from(table).delete().eq('id', removing.id);
      if (error) throw error;
      setMessage('تم حذف العقار بنجاح.');
      setRemoving(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'فشل حذف العقار.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard-content flex flex-col space-y-5">
      {message && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-4 text-sm font-semibold">
          {message}
          <button onClick={() => setMessage('')} className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-8 text-sm">
          <LoaderCircle size={16} className="animate-spin" />
          جارٍ التحميل...
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black">إدارة العقارات</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {shown.length} عقار • {properties.filter((p) => p.kind === 'sale').length} للبيع •{' '}
                {properties.filter((p) => p.kind === 'rental').length} للإيجار
              </p>
            </div>
            <button
              onClick={() => openForm()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 font-bold text-white"
            >
              <Plus size={16} /> عقار جديد
            </button>
          </div>

          {/* Filters */}
          <div className="dashboard-controls">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3">
              <Search size={16} className="text-[var(--muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالعنوان أو المنطقة"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as '' | PropertyKind)}
              className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
            >
              <option value="">كل الأنواع</option>
              <option value="sale">بيع</option>
              <option value="rental">إيجار</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
            >
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>

            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold"
            >
              <option value="">كل المناطق</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Properties Table */}
          {shown.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-8 text-center">
              <p className="text-sm text-[var(--muted)]">لا توجد عقارات حالياً</p>
            </div>
          ) : (
            <div className="responsive-table rounded-xl border border-[var(--line)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--canvas)]">
                    <th className="p-3 text-right font-semibold">الصورة</th>
                    <th className="p-3 text-right font-semibold">العنوان</th>
                    <th className="p-3 text-right font-semibold">النوع</th>
                    <th className="p-3 text-right font-semibold">السعر</th>
                    <th className="p-3 text-right font-semibold">المنطقة</th>
                    <th className="p-3 text-right font-semibold">الحالة</th>
                    <th className="p-3 text-center font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--line)] hover:bg-[var(--canvas)]">
                      <td className="p-3">
                        {images[p.id]?.[0] ? (
                          <img
                            src={images[p.id][0]}
                            alt={p.title}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--canvas)] text-[10px]">
                            —
                          </div>
                        )}
                      </td>
                      <td className="p-3">{p.title}</td>
                      <td className="p-3">
                        <span className="rounded bg-[var(--canvas)] px-2 py-1 text-[11px] font-bold">
                          {p.kind === 'sale' ? 'بيع' : 'إيجار'}
                        </span>
                      </td>
                      <td className="p-3">{formatEgp(p.price)}</td>
                      <td className="p-3 text-[var(--muted)]">{p.location || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`rounded px-2 py-1 text-[11px] font-bold ${
                            p.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                          }`}
                        >
                          {p.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewing(p)}
                            className="text-[var(--muted)] hover:text-[var(--ink)]"
                            title="عرض"
                          >
                            <Search size={16} />
                          </button>
                          <button
                            onClick={() => openForm(p)}
                            className="text-[var(--muted)] hover:text-[var(--ink)]"
                            title="تعديل"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setRemoving(p)}
                            className="text-[var(--muted)] hover:text-red-600"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <form
            onSubmit={submitForm}
            className="modal-frame rounded-2xl bg-[var(--surface)] p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">{editing ? 'تعديل العقار' : 'عقار جديد'}</h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg hover:bg-[var(--canvas)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Kind Selection */}
              {!editing && (
                <div>
                  <label className="block text-sm font-bold mb-2">نوع العقار</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="kind"
                        value="sale"
                        checked={form.kind === 'sale'}
                        onChange={(e) => setForm({ ...form, kind: e.target.value as PropertyKind })}
                        className="rounded"
                      />
                      للبيع
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="kind"
                        value="rental"
                        checked={form.kind === 'rental'}
                        onChange={(e) => setForm({ ...form, kind: e.target.value as PropertyKind })}
                        className="rounded"
                      />
                      للإيجار
                    </label>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="العنوان"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
                <input
                  type="text"
                  placeholder="نوع العقار"
                  value={form.property_type}
                  onChange={(e) => setForm({ ...form, property_type: e.target.value })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
              </div>

              <textarea
                placeholder="الوصف"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-20 w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
              />

              {/* Location and Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="المنطقة"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
                <input
                  type="number"
                  placeholder="السعر"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
              </div>

              {/* Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="المساحة (م²)"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
                <input
                  type="number"
                  placeholder="عدد الغرف"
                  value={form.bedrooms}
                  onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="عدد الحمامات"
                  value={form.bathrooms}
                  onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
                <input
                  type="text"
                  placeholder="الواجهة"
                  value={form.facade}
                  onChange={(e) => setForm({ ...form, facade: e.target.value })}
                  className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-bold mb-2">الصور</label>
                {form.image_files.length > 0 && (
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    {form.image_files.map((file, i) => (
                      <div key={i} className="relative h-20 rounded-lg bg-[var(--canvas)]">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="معاينة"
                          className="h-full w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] bg-[var(--canvas)] font-bold text-[var(--muted)] transition hover:bg-[var(--surface)]">
                  <ImagePlus size={16} />
                  إضافة صور
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageAdd(e.currentTarget.files)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-bold mb-2">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-4 py-2 text-sm outline-none"
                >
                  <option value="draft">مسودة</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-[var(--brand)] py-3 font-bold text-white disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <LoaderCircle size={16} className="mr-2 inline-block animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : editing ? (
                  'تحديث العقار'
                ) : (
                  'إنشاء العقار'
                )}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-[var(--line)] px-6 py-3 font-bold"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black">{viewing.title}</h2>
              <button
                onClick={() => setViewing(null)}
                className="rounded-lg hover:bg-[var(--canvas)]"
              >
                <X size={20} />
              </button>
            </div>

            {images[viewing.id]?.[0] && (
              <div className="mb-4 relative">
                <img
                  src={images[viewing.id][0]}
                  alt={viewing.title}
                  className="h-64 w-full rounded-lg object-cover"
                />
                {images[viewing.id].length > 1 && (
                  <button
                    onClick={() => setFullImage(images[viewing.id][0])}
                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 rounded-lg transition"
                  >
                    <Download size={24} className="text-white" />
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[var(--muted)]">النوع</p>
                  <p className="font-bold">{viewing.kind === 'sale' ? 'بيع' : 'إيجار'}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">نوع العقار</p>
                  <p className="font-bold">{viewing.property_type || '—'}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">السعر</p>
                  <p className="font-bold">
                    {formatEgp(viewing.price)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">المنطقة</p>
                  <p className="font-bold">{viewing.location || '—'}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">المساحة</p>
                  <p className="font-bold">{viewing.area || '—'} م²</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">الغرف</p>
                  <p className="font-bold">{viewing.bedrooms || '—'}</p>
                </div>
              </div>
              {viewing.description && (
                <div>
                  <p className="text-[var(--muted)]">الوصف</p>
                  <p className="font-bold">{viewing.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewing(null)}
              className="mt-6 w-full rounded-lg border border-[var(--line)] py-3 font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {removing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
            <h2 className="text-lg font-black">تأكيد الحذف</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              هل أنت متأكد من رغبتك في حذف &quot;{removing.title}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={deleteProperty}
                disabled={saving}
                className="flex-1 rounded-lg bg-red-600 py-2 font-bold text-white disabled:opacity-60"
              >
                {saving ? 'جارٍ الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setRemoving(null)}
                className="rounded-lg border border-[var(--line)] px-6 py-2 font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Modal */}
      {fullImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          onClick={() => setFullImage(null)}
        >
          <img
            src={fullImage}
            alt="عرض كامل"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
