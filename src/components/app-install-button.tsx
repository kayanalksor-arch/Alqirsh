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
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const updateStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setIsStandalone(standalone);
      return standalone;
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setFallbackMode(false);
      setIsVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setFallbackMode(false);
      setIsStandalone(true);
    };

    updateStandalone();

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const timer = window.setTimeout(() => {
      if (!updateStandalone() && !deferredPrompt) {
        setFallbackMode(true);
        setIsVisible(true);
      }
    }, 1800);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(92vw,360px)] rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.2)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--canvas)]">
          <Image src="/brand/alqirsh-logo.jpg" alt="القِرش" width={52} height={52} className="size-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)]">تطبيق القِرش</p>
          <h3 className="mt-1 text-base font-black">{fallbackMode ? 'تثبيت التطبيق' : 'تنزيل التطبيق'}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {fallbackMode ? 'استخدم قائمة المتصفح ثم أضف إلى الشاشة الرئيسية.' : 'أضف التطبيق للوصول السريع للاستخدام.'}
          </p>
        </div>

        <button type="button" aria-label="إغلاق" onClick={() => setIsVisible(false)} className="grid size-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)]">
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={fallbackMode ? () => setIsVisible(false) : handleInstall}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-sm font-bold text-white"
        >
          <Download size={15} /> {fallbackMode ? 'حسناً' : 'تنزيل'}
        </button>
        <button type="button" onClick={() => setIsVisible(false)} className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--muted)]">
          لاحقًا
        </button>
      </div>
    </div>
  );
}
