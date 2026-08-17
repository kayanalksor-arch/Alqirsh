'use client';
import { useEffect } from 'react';

export function PropertyOwnerNameResolver({ owners }: { owners: { id: string; full_name: string }[] }) {
  useEffect(() => {
    const names = new Map(owners.map((owner) => [owner.id, owner.full_name]));
    const replaceIds = () => document.querySelectorAll('dd, strong, b').forEach((node) => {
      const value = node.textContent?.trim();
      if (value && names.has(value)) node.textContent = names.get(value)!;
    });
    replaceIds();
    const observer = new MutationObserver(replaceIds);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [owners]);
  return null;
}
