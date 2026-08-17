"use client";

import Image from 'next/image';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function AppInstallButton() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const updateStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setIsStandalone(standalone);
      return standalone;
    };

    const detectInstallSupport = () => {
      const ua = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
      const isChromiumDesktop = /Chrome|Edg|Opera/i.test(ua) && !/Mobile/i.test(ua);
      return !updateStandalone() && (isMobile || isChromiumDesktop);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    setCanInstall(detectInstallSupport());
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt && !canInstall) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstall(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const event = new CustomEvent('beforeinstallprompt');
      window.dispatchEvent(event);
    }
  };

  if (isStandalone || !canInstall) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-95"
      aria-label="تحميل التطبيق"
    >
      <Image src="/brand/alqirsh-logo.jpg" alt="شعار القِرش" width={28} height={28} className="size-7 rounded-lg object-cover" />
      <span className="hidden sm:inline">تحميل التطبيق</span>
      <Download size={15} />
    </button>
  );
}
