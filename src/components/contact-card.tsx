'use client';

import { Check, Copy, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ContactSettings = { app_name: string | null; contact_phone: string | null; about_text: string | null };
const fallbackPhones = ['01090886364', '01019905309'];
const phonesFrom = (value: string | null) => value?.split(/[\n,/|-]+/).map((phone) => phone.trim()).filter(Boolean) ?? fallbackPhones;

export function ContactCard() {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<ContactSettings | null>(null);
  useEffect(() => { void createClient().from('app_settings').select('app_name,contact_phone,about_text').limit(1).maybeSingle().then(({ data }) => setSettings(data)); }, []);
  const phones = phonesFrom(settings?.contact_phone ?? null);
  const copy = async () => { try { await navigator.clipboard.writeText(phones.join(' - ')); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } };
  return <section className="contact-hero mx-auto max-w-3xl rounded-[1.75rem] p-7 text-center shadow-xl shadow-emerald-950/15 sm:p-12"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/12"><Phone size={25}/></span><p className="contact-hero-kicker mt-6 text-sm font-bold">{settings?.app_name || 'القِرش'} | تواصل معنا</p><h1 className="mt-2 text-3xl font-black">تواصل معنا</h1><p className="contact-hero-copy mt-4 text-sm leading-7">{settings?.about_text || 'للاستفسار عن العروض وخدمات المنصة، تواصل معنا مباشرة.'}</p><div dir="ltr" className="mt-8 grid gap-2 text-2xl font-black tracking-wide sm:text-3xl">{phones.map((phone) => <a key={phone} href={`tel:${phone.replace(/\s+/g, '')}`} className="w-fit justify-self-center transition hover:text-emerald-200">{phone}</a>)}</div><div className="mt-8 flex flex-wrap justify-center gap-3"><a href={`tel:${phones[0]?.replace(/\s+/g, '') ?? ''}`} className="contact-hero-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-bold"><Phone size={18}/>اتصال الآن</a><button type="button" onClick={copy} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/40 px-5 font-bold text-white transition hover:bg-white/10">{copied ? <Check size={18}/> : <Copy size={18}/>} {copied ? 'تم النسخ' : 'نسخ الأرقام'}</button></div></section>;
}
