"use client";

import Image from 'next/image';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function AppInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setOpen(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setOpen(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setOpen(false);
  };

  if (!open || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(92vw,360px)] rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.2)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--canvas)]">
          <Image src="/brand/alqirsh-logo.jpg" alt="القِرش" width={52} height={52} className="size-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)]">تطبيق القِرش</p>
          <h3 className="mt-1 text-base font-black">تنزيل التطبيق</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">أضف التطبيق للوصول السريع للاستخدام.</p>
        </div>

        <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)]">
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={handleInstall} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-sm font-bold text-white">
          <Download size={15} /> تنزيل
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--muted)]">
          لاحقًا
        </button>
      </div>
    </div>
  );
}
