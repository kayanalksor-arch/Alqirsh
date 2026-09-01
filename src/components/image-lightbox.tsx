'use client';
/* eslint-disable @next/next/no-img-element */

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ImageLightbox({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!images.length) {
    return <div className="grid h-full min-h-80 place-items-center rounded-[1.5rem] bg-[var(--canvas)] text-[var(--muted)]">لا توجد صور</div>;
  }

  const activeImage = images[activeIndex] ?? images[0];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group block w-full overflow-hidden rounded-[1.5rem] bg-[var(--canvas)]" aria-label={`فتح صورة ${title} بالحجم الكامل`}>
        <img src={activeImage} alt={title} className="block h-[min(65vw,32rem)] min-h-64 w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        <span className="sr-only">اضغط لفتح الصورة بالحجم الكامل</span>
      </button>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 p-3">
          {images.slice(0, 4).map((image, index) => (
            <button type="button" key={`${image}-${index}`} onClick={() => setActiveIndex(index)} className={`overflow-hidden rounded-lg border-2 ${index === activeIndex ? 'border-[var(--primary)]' : 'border-transparent'}`} aria-label={`عرض الصورة ${index + 1}`}>
              <img src={image} alt="" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--overlay)] p-4" role="dialog" aria-modal="true" aria-label={`معاينة صور ${title}`} onClick={() => setOpen(false)}>
          <div className="flex max-h-full max-w-5xl flex-col items-center gap-4" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="self-end grid size-11 place-items-center rounded-full border border-white/25 bg-black/35 text-white" aria-label="إغلاق الصورة">
              <X size={20} />
            </button>
            <img src={activeImage} alt={title} className="max-h-[72vh] max-w-full rounded-xl object-contain" />
            <a href={activeImage} download className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-[var(--primary-foreground)]">
              <Download size={17} /> تنزيل الصورة
            </a>
          </div>
        </div>
      )}
    </>
  );
}
