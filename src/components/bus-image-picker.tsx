'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';

const allowed = new Set(['image/jpeg','image/png','image/webp']);

async function compressImage(source: File, locale: 'ar'|'en') {
  const t=(ar:string,en:string)=>locale==='en'?en:ar;
  if (!allowed.has(source.type)) throw new Error(t('\u0627\u062e\u062a\u0631 \u0635\u0648\u0631\u0629 JPG \u0623\u0648 PNG \u0623\u0648 WEBP \u0641\u0642\u0637.','Choose JPG, PNG, or WEBP only.'));
  if (source.size > 12 * 1024 * 1024) throw new Error(t('\u062d\u062c\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u064a\u062c\u0628 \u0623\u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 12 \u0645\u064a\u062c\u0627\u0628\u0627\u064a\u062a.','Source image must be 12 MB or smaller.'));
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error(t('\u062a\u0639\u0630\u0631 \u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u0635\u0648\u0631\u0629.','Could not process the image.'));
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  const blob=await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,'image/webp',0.88));
  if(!blob) throw new Error(t('\u062a\u0639\u0630\u0631 \u0636\u063a\u0637 \u0627\u0644\u0635\u0648\u0631\u0629.','Could not compress the image.'));
  return new File([blob],`${source.name.replace(/\.[^.]+$/u,'')}.webp`,{type:'image/webp'});
}

export function BusImagePicker({ existingUrl, locale='ar', onFileChange }: { existingUrl?: string|null; locale?: 'ar'|'en'; onFileChange?:(file:File|null)=>void }) {
  const [preview,setPreview]=useState<string|null>(existingUrl??'/brand/alqirsh-logo.png'); const [file,setFile]=useState<File|null>(null); const [error,setError]=useState('');
  const en=locale==='en'; const t=(ar:string,english:string)=>en?english:ar;
  useEffect(()=>()=>{if(preview?.startsWith('blob:')) URL.revokeObjectURL(preview)},[preview]);
  async function choose(next:File|null) {
    setError(''); if(!next){if(preview?.startsWith('blob:')) URL.revokeObjectURL(preview);setFile(null);setPreview('/brand/alqirsh-logo.png');onFileChange?.(null);return;}
    try{const optimized=await compressImage(next,locale);if(preview?.startsWith('blob:'))URL.revokeObjectURL(preview);setFile(optimized);setPreview(URL.createObjectURL(optimized));onFileChange?.(optimized);}
    catch(e){setError(e instanceof Error?e.message:t('\u062a\u0639\u0630\u0631 \u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u0635\u0648\u0631\u0629.','Could not process this image.'));}
  }
  return <div className="grid gap-2 sm:col-span-2 lg:col-span-4"><span className="text-sm font-bold">{t('صورة الباص','Bus photo')}</span>
    {preview?<div className="relative aspect-[16/7] max-w-2xl overflow-hidden rounded-xl border border-[var(--line)]"><Image src={preview} alt={t('معاينة صورة الباص','Bus photo preview')} fill unoptimized className="object-cover"/><span className="absolute bottom-2 start-2 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">{file?`${(file.size/1024).toFixed(0)} KB`:t('الصورة الحالية','Current image')}</span></div>:<div className="grid aspect-[16/7] max-w-2xl place-items-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--canvas)]"><ImagePlus className="text-[var(--muted)]" size={32}/></div>}
    <div className="flex flex-wrap gap-2"><label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-white"><ImagePlus size={18}/>{t('رفع صورة الباص','Upload bus photo')}<input data-bus-image-input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e)=>void choose(e.target.files?.[0]??null)}/></label>{preview&&<button type="button" onClick={()=>void choose(null)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 font-bold"><Trash2 size={17}/>{t('حذف / استخدام الشعار','Remove / use logo')}</button>}{preview&&<button type="button" onClick={()=>document.getElementById('bus-image-replace')?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 font-bold"><RotateCcw size={17}/>{t('استبدال الصورة','Replace photo')}</button>}<input id="bus-image-replace" data-bus-image-input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e)=>void choose(e.target.files?.[0]??null)}/></div>
    <input type="hidden" name="image_action" value={file?'replace':existingUrl&&!preview?'remove':'keep'}/>{file&&<input type="hidden" name="image_file_name" value={file.name}/>}
    {error&&<p role="alert" className="text-sm text-[var(--error-foreground)]">{error}</p>}
  </div>;
}
