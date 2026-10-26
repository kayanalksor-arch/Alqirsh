'use client';

import { useState } from 'react';

const fallbackSrc = '/brand/alqirsh-logo.png';

export function ListingImage({ src, alt, className, sizes, fill = false }: {
  src?: string | null;
  alt: string;
  className: string;
  sizes?: string;
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const imageSrc = !src || failed ? fallbackSrc : src;

  if (fallbackFailed) return <span role="img" aria-label={`${alt} — شعار القِرش غير متاح`} className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={imageSrc === fallbackSrc ? `شعار القِرش — ${alt}` : alt}
      sizes={sizes}
      onError={() => imageSrc === fallbackSrc ? setFallbackFailed(true) : setFailed(true)}
      className={`${className} ${fill ? 'absolute inset-0 h-full w-full' : ''} ${imageSrc === fallbackSrc ? 'object-contain' : ''}`}
    />
  );
}
