'use client';

import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveBusWithImage } from '@/app/actions/bus';
import { BusImagePicker } from '@/components/bus-image-picker';
import { localizeBusError } from '@/lib/bus-localization';

export function BusCreateForm({locale='ar'}:{locale?:'ar'|'en'}) {
  const router=useRouter();const form=useRef<HTMLFormElement>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [ok,setOk]=useState('');const [image,setImage]=useState<File|null>(null);const en=locale==='en';const t=(a:string,b:string)=>en?b:a;
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError('');setOk('');
    try{const data=new FormData(event.currentTarget);const response=await saveBusWithImage(data,image);if(!response.ok)throw new Error(response.error);setOk(t('تم حفظ الباص وصورته.','Bus and photo saved.'));setImage(null);form.current?.reset();router.refresh();}
    catch(e){setError(localizeBusError(e instanceof Error?e.message:'',locale));}finally{setBusy(false);}}
  return <form ref={form} onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <label>{t('اسم الباص','Bus name')}<input name="name" required maxLength={120}/></label><label>{t('رقم الباص','Bus number')}<input name="bus_number" required maxLength={40}/></label><label>{t('رقم اللوحة','Plate number')}<input name="plate_number" maxLength={40}/></label><label>{t('نوع الباص','Bus type')}<input name="bus_type" required maxLength={60}/></label><label>{t('الشركة المصنعة','Manufacturer')}<input name="manufacturer" maxLength={80}/></label><label>{t('الموديل','Model')}<input name="model" maxLength={80}/></label><label>{t('عدد المقاعد','Seat count')}<input name="capacity" type="number" min="4" max="100" defaultValue="40" required/></label>
    <BusImagePicker locale={locale} onFileChange={setImage}/><label className="sm:col-span-2 lg:col-span-4">{t('الخدمات المتوفرة مفصولة بفواصل','Services, separated by commas')}<input name="services" maxLength={500} placeholder={t('تكييف، واي فاي','AC, Wi-Fi')}/></label>
    {error&&<p role="alert" className="rounded-xl bg-[var(--error-surface)] p-3 text-sm text-[var(--error-foreground)] sm:col-span-2 lg:col-span-4">{error}</p>}{ok&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 sm:col-span-2 lg:col-span-4">{ok}</p>}
    <button disabled={busy} className="min-h-11 rounded-xl bg-[var(--brand)] px-4 font-bold text-white disabled:opacity-60 sm:col-span-2 lg:col-span-4">{busy?t('جارٍ الحفظ والرفع…','Uploading and saving…'):t('إنشاء الباص والمقاعد','Create bus and seats')}</button>
  </form>;
}
