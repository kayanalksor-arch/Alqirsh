'use client';

import { useState } from 'react';
import Image from 'next/image';

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
    <Image
      src={imageSrc}
      alt={imageSrc === fallbackSrc ? `شعار القِرش — ${alt}` : alt}
      fill={fill}
      width={fill ? undefined : 750}
      height={fill ? undefined : 420}
      sizes={sizes}
      quality={75}
      onError={() => imageSrc === fallbackSrc ? setFallbackFailed(true) : setFailed(true)}
      className={`${className} ${fill ? 'absolute inset-0 h-full w-full' : ''} ${imageSrc === fallbackSrc ? 'object-contain' : ''}`}
      unoptimized={imageSrc === fallbackSrc}
    />
  );
}
