'use client';
/* eslint-disable @next/next/no-img-element */

import { Building2, CheckCircle2, ImagePlus, LoaderCircle, Phone, Save, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Settings = { id: string | null; app_name: string; contact_phone: string; about_text: string; logo_url: string };
const emptySettings = (): Settings => ({ id: null, app_name: '', contact_phone: '', about_text: '', logo_url: '' });

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: loadError } = await createClient().from('app_settings').select('id,app_name,contact_phone,about_text,logo_url').limit(1).maybeSingle();
    if (loadError) setError('تعذّر تحميل الإعدادات. تحقق من صلاحية حساب المدير.');
    else if (data) setSettings({ id: data.id, app_name: data.app_name ?? '', contact_phone: data.contact_phone ?? '', about_text: data.about_text ?? '', logo_url: data.logo_url ?? '' });
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setLogoFile(file);
    setSettings((current) => ({ ...current, logo_url: URL.createObjectURL(file) }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!settings.app_name.trim()) { setError('اسم المنصة مطلوب.'); return; }
    setSaving(true);
    const db = createClient();
    let logoUrl = settings.logo_url.trim() || null;
    if (logoFile) {
      const extension = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `settings/platform-logo.${extension}`;
      const { error: uploadError } = await db.storage.from('listing-images').upload(path, logoFile, { contentType: logoFile.type || 'image/png', upsert: true });
      if (uploadError) { setError('تعذّر رفع الشعار. تحقق من مساحة التخزين والصلاحيات.'); setSaving(false); return; }
      logoUrl = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    }
    const payload = { app_name: settings.app_name.trim(), contact_phone: settings.contact_phone.trim() || null, about_text: settings.about_text.trim() || null, logo_url: logoUrl };
    const response = settings.id ? await db.from('app_settings').update(payload).eq('id', settings.id).select('id,app_name,contact_phone,about_text,logo_url').single() : await db.from('app_settings').insert(payload).select('id,app_name,contact_phone,about_text,logo_url').single();
    if (response.error || !response.data) setError('تعذّر حفظ الإعدادات. تحقق من صلاحيات حساب المدير.');
    else { setSettings({ id: response.data.id, app_name: response.data.app_name ?? '', contact_phone: response.data.contact_phone ?? '', about_text: response.data.about_text ?? '', logo_url: response.data.logo_url ?? '' }); setLogoFile(null); setMessage('تم حفظ إعدادات المنصة بنجاح.'); }
    setSaving(false);
  }

  if (loading) return <main className="grid min-h-64 place-items-center p-5"><LoaderCircle className="animate-spin text-[var(--brand)]"/><span className="sr-only">جارٍ تحميل الإعدادات</span></main>;
  return <form onSubmit={save} className="dashboard-content max-w-5xl"><div className="grid gap-5 lg:grid-cols-[1fr_.72fr]"><section className="panel rounded-2xl p-5 sm:p-6"><p className="eyebrow">بيانات المنصة</p><h2 className="mt-1 text-xl font-black">الهوية والتواصل</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">تُحفظ هذه البيانات في Supabase وتظهر في صفحة التواصل عند توفرها.</p><div className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-bold">اسم المنصة<input required value={settings.app_name} onChange={(event) => setSettings({ ...settings, app_name: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 outline-none" placeholder="مثال: القِرش | Alqirsh"/></label><label className="grid gap-2 text-sm font-bold">هاتف التواصل<input dir="ltr" value={settings.contact_phone} onChange={(event) => setSettings({ ...settings, contact_phone: event.target.value })} className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-right outline-none" placeholder="01000000000"/></label><label className="grid gap-2 text-sm font-bold">نبذة عن المنصة<textarea value={settings.about_text} onChange={(event) => setSettings({ ...settings, about_text: event.target.value })} rows={5} className="min-h-28 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 outline-none" placeholder="نبذة موجزة تظهر لزوار المنصة."/></label></div><div className="mt-6 flex flex-wrap items-center gap-3"><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold text-white disabled:opacity-60"><Save size={17}/>{saving ? 'جارٍ الحفظ…' : settings.id ? 'حفظ التغييرات' : 'إنشاء الإعدادات وحفظها'}</button>{message && <p role="status" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--success)]"><CheckCircle2 size={17}/>{message}</p>}</div>{error && <p role="alert" className="mt-4 rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-3 text-sm font-semibold text-[var(--error-foreground)]">{error}</p>}</section><aside className="panel rounded-2xl p-5 sm:p-6"><p className="eyebrow">شعار المنصة</p><h2 className="mt-1 text-xl font-black">الصورة المعروضة</h2><div className="mt-5 grid min-h-44 place-items-center overflow-hidden rounded-2xl border border-dashed border-[var(--line)] bg-[var(--canvas)] p-4">{settings.logo_url ? <img src={settings.logo_url} alt="معاينة شعار المنصة" className="max-h-36 max-w-full object-contain"/> : <div className="text-center text-[var(--muted)]"><Building2 className="mx-auto" size={30}/><p className="mt-2 text-sm">لم يتم إضافة شعار من الإعدادات بعد</p></div>}</div><label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:bg-[var(--canvas)]"><ImagePlus size={17}/>رفع شعار<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseLogo} className="sr-only"/></label>{settings.logo_url && <button type="button" onClick={() => { setLogoFile(null); setSettings({ ...settings, logo_url: '' }); }} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--danger)]"><X size={15}/>إزالة الشعار من الإعدادات</button>}<div className="mt-6 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]"><p className="flex items-center gap-2"><Phone size={16}/>رقم التواصل والنبذة متصلان بصفحة «تواصل معنا».</p></div></aside></div></form>;
}
