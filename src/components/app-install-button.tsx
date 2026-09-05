"use client";

import Image from 'next/image';
import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function AppInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone;
    const dismissed = localStorage.getItem('alqirsh-install-dismissed') === '1';
    const stateTimer = window.setTimeout(() => {
      setIsStandalone(standalone);
      setIsIos(ios);
    }, 0);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!dismissed && !standalone) setIsVisible(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    const timer = window.setTimeout(() => {
      if (ios && !dismissed) setIsVisible(true);
    }, 1800);

    return () => {
      window.clearTimeout(stateTimer);
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') setIsVisible(false);
    } finally {
      setIsInstalling(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem('alqirsh-install-dismissed', '1');
    setIsVisible(false);
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[min(92vw,360px)] rounded-[1.5rem] border border-[var(--border)] bg-[var(--popover)] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.2)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--canvas)]">
          <Image src="/brand/icon-logo.png" alt="القِرش" width={52} height={52} className="size-full object-cover" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[var(--muted)]">تطبيق القِرش</p>
          <h3 className="mt-1 text-base font-black">تثبيت التطبيق</h3>
          {isIos ? (
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-[var(--muted)]">
              <li>اضغط زر مشاركة.</li>
              <li>اختر إضافة إلى الشاشة الرئيسية.</li>
              <li>اضغط إضافة.</li>
            </ol>
          ) : <p className="mt-1 text-xs text-[var(--muted)]">أضف التطبيق للوصول السريع للاستخدام.</p>}
        </div>

        <button type="button" aria-label="إغلاق" onClick={dismiss} className="grid size-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)]">
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={isIos ? dismiss : handleInstall}
          disabled={isInstalling}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {isIos ? <Share size={15} /> : <Download size={15} />} {isInstalling ? 'جاري التثبيت...' : isIos ? 'إغلاق' : 'تثبيت التطبيق'}
        </button>
        <button type="button" onClick={dismiss} className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm font-bold text-[var(--muted)]">
          لاحقًا
        </button>
      </div>
    </div>
  );
}
