'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { saveBusImage } from '@/app/actions/bus';
import { BusImagePicker } from '@/components/bus-image-picker';
import { localizeBusError } from '@/lib/bus-localization';

export function BusImageManager({busId,path,locale='ar'}:{busId:string;path:string|null;locale?:'ar'|'en'}){
 const [file,setFile]=useState<File|null>(null);const[remove,setRemove]=useState(false);const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const router=useRouter();const db=createClient();const url=path?db.storage.from('bus-images').getPublicUrl(path).data.publicUrl:null;const en=locale==='en';const t=(a:string,b:string)=>en?b:a;
 async function save(){if(busy)return;setBusy(true);setMessage('');try{const response=await saveBusImage(busId,file,remove);if(!response.ok)throw new Error(response.error);setFile(null);setRemove(false);setMessage(t('تم تحديث الصورة.','Photo updated.'));router.refresh();}catch(e){setMessage(localizeBusError(e instanceof Error?e.message:'',locale));}finally{setBusy(false);}}
 return <div className="mt-3 border-t border-[var(--line)] pt-3"><BusImagePicker key={path??'no-photo'} existingUrl={url} locale={locale} onFileChange={(next)=>{setFile(next);setRemove(!next);}}/><button type="button" disabled={busy||(!file&&!remove)} onClick={()=>void save()} className="mt-3 min-h-10 rounded-lg bg-[var(--brand)] px-4 text-sm font-bold text-white disabled:opacity-50">{busy?t('جارٍ الحفظ…','Saving…'):t('حفظ صورة الباص','Save bus photo')}</button>{message&&<p role="status" className="mt-2 text-xs">{message}</p>}</div>
}
