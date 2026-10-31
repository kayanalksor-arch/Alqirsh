export function localizeBusService(service: string, locale: 'ar' | 'en') {
  const normalized = service.trim().toLocaleLowerCase();
  const aliases: [RegExp, RegExp, string, string][] = [
    [/\b(ac|a\/c|air conditioning|air conditioner)\b/u, /تكييف|مكيف/u, 'تكييف', 'Air conditioning'],
    [/\bwi[\s-]?fi\b/u, /واي\s*فاي/u, 'واي فاي', 'Wi-Fi'],
    [/\b(usb )?charger\b/u, /شاحن/u, 'شاحن', 'Charger'],
    [/\b(reclining|recliner) seats?\b/u, /مقاعد?\s*(مريحة|قابلة\s*للإمالة)/u, 'مقاعد مريحة', 'Reclining seats'],
    [/\b(toilet|restroom)\b/u, /دورة\s*مياه|حمام/u, 'دورة مياه', 'Restroom'],
    [/\b(tv|screen|entertainment)\b/u, /شاشة|ترفيه/u, 'شاشة ترفيه', 'Entertainment screen'],
    [/\b(blanket|pillow)\b/u, /بطانية|وسادة/u, 'بطانية ووسادة', 'Blanket and pillow'],
    [/\b(air condition|ac seats)\b/u, /تكييف/u, 'تكييف', 'Air conditioning'],
  ];
  for (const [englishPattern, arabicPattern, arabic, english] of aliases) {
    if (englishPattern.test(normalized) || arabicPattern.test(service)) return locale === 'ar' ? arabic : english;
  }
  if (/[\u0600-\u06ff]/u.test(service)) return locale === 'ar' ? service.trim() : 'Additional service';
  return locale === 'en' ? service.trim() : 'خدمة إضافية';
}
