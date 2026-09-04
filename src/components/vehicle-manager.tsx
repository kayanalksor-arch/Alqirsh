'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CarFront, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addBrandWatermark } from '@/lib/image-watermark';
import { formatEgp } from '@/lib/listings';

type Vehicle = {
  id: string;
  title: string;
  listing_type: 'sale' | 'rent' | string | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
  condition: string | null;
  price: number | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  fuel_type: string | null;
  transmission: string | null;
  mileage: number | null;
  color: string | null;
  location: string | null;
  status: string | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  image_url: string | null;
  created_at: string | null;
};

type FormState = {
  title: string;
  listing_type: 'sale' | 'rent';
  brand: string;
  model: string;
  variant: string;
  year: string;
  condition: string;
  price: string;
  daily_price: string;
  weekly_price: string;
  monthly_price: string;
  fuel_type: string;
  transmission: string;
  mileage: string;
  color: string;
  location: string;
  status: string;
  description: string;
  contact_name: string;
  contact_phone: string;
};

const blank = (): FormState => ({
  title: '',
  listing_type: 'sale',
  brand: '',
  model: '',
  variant: '',
  year: '',
  condition: 'used',
  price: '',
  daily_price: '',
  weekly_price: '',
  monthly_price: '',
  fuel_type: '',
  transmission: '',
  mileage: '',
  color: '',
  location: '',
  status: 'active',
  description: '',
  contact_name: '',
  contact_phone: '',
});

async function ensureManager() {
  const db = createClient();
  const { data: { user }, error: userError } = await db.auth.getUser();
  if (userError || !user) throw new Error('يجب تسجيل الدخول أولاً.');
  const { data: canManage, error: permissionError } = await db.rpc('is_platform_manager');
  if (permissionError) throw permissionError;
  if (!canManage) throw new Error('لا توجد صلاحية كافية لإدارة السيارات.');
  return user.id;
}

export function VehicleManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(blank());
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Vehicle | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await createClient()
        .from('vehicle_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage('تعذر تحميل السيارات: ' + error.message);
        setVehicles([]);
      } else {
        setVehicles((data ?? []) as Vehicle[]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحميل السيارات.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const haystack = `${v.title} ${v.brand || ''} ${v.model || ''} ${v.location || ''} ${v.description || ''}`.toLowerCase();
      const q = query.trim().toLowerCase();
      const matchQ = !q || haystack.includes(q);
      const matchType = !typeFilter || v.listing_type === typeFilter;
      const matchStatus = !statusFilter || v.status === statusFilter;
      return matchQ && matchType && matchStatus;
    });
  }, [vehicles, query, typeFilter, statusFilter]);

  function openForm(item?: Vehicle) {
    if (item) {
      setEditing(item);
      setForm({
        title: item.title || '',
        listing_type: (item.listing_type as 'sale' | 'rent') || 'sale',
        brand: item.brand || '',
        model: item.model || '',
        variant: item.variant || '',
        year: item.year ? String(item.year) : '',
        condition: item.condition || 'used',
        price: item.price ? String(item.price) : '',
        daily_price: item.daily_price ? String(item.daily_price) : '',
        weekly_price: item.weekly_price ? String(item.weekly_price) : '',
        monthly_price: item.monthly_price ? String(item.monthly_price) : '',
        fuel_type: item.fuel_type || '',
        transmission: item.transmission || '',
        mileage: item.mileage ? String(item.mileage) : '',
        color: item.color || '',
        location: item.location || '',
        status: item.status || 'active',
        description: item.description || '',
        contact_name: item.contact_name || '',
        contact_phone: item.contact_phone || '',
      });
    } else {
      setEditing(null);
      setForm(blank());
    }
    setPendingImages([]);
    setFormOpen(true);
  }

  function handleImageAdd(evt: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(evt.target.files || []);
    setPendingImages((p) => [...p, ...files]);
  }

  function removeImage(idx: number) {
    setPendingImages((p) => p.filter((_, i) => i !== idx));
  }

  async function submitForm(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();

    if (!form.title.trim()) {
      setMessage('العنوان مطلوب');
      return;
    }

    if (form.listing_type === 'sale' && !form.price) {
      setMessage('السعر مطلوب للبيع');
      return;
    }

    if (form.listing_type === 'rent' && !form.daily_price && !form.weekly_price && !form.monthly_price) {
      setMessage('يجب إدخال سعر واحد على الأقل للإيجار');
      return;
    }

    setSaving(true);
    try {
      const userId = await ensureManager();
      const db = createClient();

      let imageUrl = editing?.image_url || null;

      if (pendingImages.length > 0) {
        const file = await addBrandWatermark(pendingImages[0]);
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `vehicles/${editing?.id || crypto.randomUUID()}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await db.storage
          .from('listing-images')
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadErr) throw new Error('فشل الرفع: ' + uploadErr.message);
        imageUrl = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        title: form.title.trim(),
        listing_type: form.listing_type,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        variant: form.variant.trim() || null,
        year: form.year ? parseInt(form.year, 10) : null,
        condition: form.condition || 'used',
        price: form.listing_type === 'sale' ? (form.price ? parseFloat(form.price) : null) : null,
        daily_price: form.listing_type === 'rent' ? (form.daily_price ? parseFloat(form.daily_price) : null) : null,
        weekly_price: form.listing_type === 'rent' ? (form.weekly_price ? parseFloat(form.weekly_price) : null) : null,
        monthly_price: form.listing_type === 'rent' ? (form.monthly_price ? parseFloat(form.monthly_price) : null) : null,
        fuel_type: form.fuel_type.trim() || null,
        transmission: form.transmission.trim() || null,
        mileage: form.mileage ? parseInt(form.mileage, 10) : null,
        color: form.color.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        description: form.description.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        image_url: imageUrl,
      };

      if (editing) {
        const { error } = await db.from('vehicle_listings').update(payload).eq('id', editing.id);
        if (error) throw error;
        setMessage('تم التحديث بنجاح');
      } else {
        const { error } = await db.from('vehicle_listings').insert({ ...payload, created_by: userId });
        if (error) throw error;
        setMessage('تمت الإضافة بنجاح');
      }

      setFormOpen(false);
      setPendingImages([]);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function deleteVehicle() {
    if (!deleting) return;
    setSaving(true);
    try {
      await ensureManager();
      const { error } = await createClient().from('vehicle_listings').delete().eq('id', deleting.id);
      if (error) throw error;
      setMessage('تم الحذف بنجاح');
      setDeleteOpen(false);
      setDeleting(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'خطأ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Controls */}
      <div className="dashboard-controls panel rounded-2xl p-4">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث"
            className="w-full bg-transparent outline-none text-sm"
          />
        </label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
        >
          <option value="">كل الأنواع</option>
          <option value="sale">بيع</option>
          <option value="rent">إيجار</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
        >
          <option value="">الكل</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <button
          onClick={() => openForm()}
          className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[var(--brand)] px-3 font-bold text-white text-sm whitespace-nowrap"
        >
          <Plus size={16} /> إضافة
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
          {message}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="panel mt-4 rounded-2xl p-8 text-center text-[var(--muted)]">
          جارٍ التحميل...
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel mt-4 rounded-2xl p-8 text-center">
          <CarFront className="mx-auto mb-3 text-[var(--brand)]" size={32} />
          <p className="font-bold">لا توجد نتائج</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <article key={v.id} className="panel overflow-hidden rounded-2xl">
              <div className="relative h-40 bg-[var(--canvas)]">
                {v.image_url ? (
                  <img src={v.image_url} alt={v.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">لا صورة</div>
                )}
                <span className="absolute right-2 top-2 rounded-full bg-[var(--brand)] px-2 py-1 text-[9px] font-bold text-white">
                  {v.listing_type === 'rent' ? 'إيجار' : 'بيع'}
                </span>
              </div>
              <div className="p-3">
                <p className="text-[10px] font-bold text-[var(--brand)]">{v.brand || '—'} / {v.model || '—'}</p>
                <p className="mt-1 font-bold text-sm truncate">{v.title}</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{v.location || '—'}</p>
                <p className="mt-2 text-base font-black text-[var(--brand)]">
                  {formatEgp(v.price ?? v.daily_price)}
                </p>
                <div className="mt-2 flex gap-1">
                  <button
                    onClick={() => { setViewing(v); setViewOpen(true); }}
                    className="flex-1 rounded-lg border border-[var(--line)] px-2 py-1.5 text-xs font-bold"
                  >
                    عرض
                  </button>
                  <button
                    onClick={() => openForm(v)}
                    className="flex-1 rounded-lg border border-[var(--line)] px-2 py-1.5 text-xs font-bold"
                  >
                    <Edit3 size={12} className="inline" />
                  </button>
                  <button
                    onClick={() => { setDeleting(v); setDeleteOpen(true); }}
                    className="flex-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-bold text-red-600"
                  >
                    <Trash2 size={12} className="inline" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <form
            onSubmit={submitForm}
            className="modal-frame my-auto rounded-2xl bg-[var(--surface)] p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{editing ? 'تعديل' : 'إضافة'}</p>
                <h2 className="mt-1 text-xl font-black">سيارة</h2>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-[var(--line)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <p className="mb-2 text-sm font-bold">النوع *</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.listing_type === 'sale'}
                      onChange={() => setForm({ ...form, listing_type: 'sale' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">بيع</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.listing_type === 'rent'}
                      onChange={() => setForm({ ...form, listing_type: 'rent' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">إيجار</span>
                  </label>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  placeholder="العنوان *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                  required
                />
                <input
                  placeholder="الماركة"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="الموديل"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="الفئة"
                  value={form.variant}
                  onChange={(e) => setForm({ ...form, variant: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="السنة"
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                  min="1900"
                  max="2100"
                />
                <input
                  placeholder="الموقع"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
              </div>

              {/* Specs */}
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  placeholder="الكيلومترات"
                  type="number"
                  value={form.mileage}
                  onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="الوقود"
                  value={form.fuel_type}
                  onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="ناقل الحركة"
                  value={form.transmission}
                  onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="اللون"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option value="new">جديدة</option>
                  <option value="used">مستعملة</option>
                  <option value="certified">معتمدة</option>
                </select>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="sold">مباع</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>

              {/* Pricing */}
              <div>
                <p className="mb-2 text-sm font-bold">السعر *</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {form.listing_type === 'sale' ? (
                    <input
                      placeholder="السعر"
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                      required
                    />
                  ) : (
                    <>
                      <input
                        placeholder="السعر اليومي"
                        type="number"
                        value={form.daily_price}
                        onChange={(e) => setForm({ ...form, daily_price: e.target.value })}
                        className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                      />
                      <input
                        placeholder="السعر الأسبوعي"
                        type="number"
                        value={form.weekly_price}
                        onChange={(e) => setForm({ ...form, weekly_price: e.target.value })}
                        className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                      />
                      <input
                        placeholder="السعر الشهري"
                        type="number"
                        value={form.monthly_price}
                        onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                        className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Description & Contact */}
              <textarea
                placeholder="الوصف"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="min-h-24 w-full rounded-xl border border-[var(--line)] bg-transparent p-3 text-sm"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  placeholder="اسم التواصل"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
                <input
                  placeholder="رقم التواصل"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="min-h-10 rounded-xl border border-[var(--line)] bg-transparent px-3 text-sm"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-bold mb-2">الصورة</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageAdd}
                  className="w-full text-sm"
                />
                {pendingImages.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {pendingImages.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--line)] p-2">
                        <span className="text-xs truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[var(--brand)] px-4 py-2 font-bold text-white text-sm disabled:opacity-60"
                >
                  {saving ? 'جارٍ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* View Modal */}
      {viewOpen && viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-black">{viewing.title}</h2>
              <button
                onClick={() => setViewOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-[var(--line)]"
              >
                <X size={16} />
              </button>
            </div>
            {viewing.image_url && (
              <img src={viewing.image_url} alt={viewing.title} className="mb-4 h-64 w-full rounded-xl object-cover" />
            )}
            <div className="space-y-2 text-sm">
              <div><strong>الماركة:</strong> {viewing.brand || '—'}</div>
              <div><strong>الموديل:</strong> {viewing.model || '—'}</div>
              <div><strong>السنة:</strong> {viewing.year || '—'}</div>
              <div><strong>السعر:</strong> {formatEgp(viewing.price ?? viewing.daily_price)}</div>
              <div><strong>الموقع:</strong> {viewing.location || '—'}</div>
              {viewing.description && <div><strong>الوصف:</strong> {viewing.description}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteOpen && deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-[var(--surface)] p-5">
            <h3 className="font-black">حذف السيارة؟</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{deleting.title}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteVehicle()}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white text-sm disabled:opacity-60"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
