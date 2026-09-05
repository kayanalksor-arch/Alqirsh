export type VehicleListing = {
  id: string;
  title: string;
  listing_type: 'sale' | 'rent' | string | null;
  brand: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;
  price: number | null;
  daily_price: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
  fuel_type: string | null;
  transmission: string | null;
  mileage: number | null;
  color: string | null;
  location: string | null;
  description: string | null;
  status: string | null;
  condition: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  image_url: string | null;
  created_at: string | null;
};

export const listingStatuses = ['available', 'reserved', 'sold', 'rented', 'pending_review', 'temporarily_unavailable', 'unavailable', 'archived', 'withdrawn'] as const;
export type ListingStatus = (typeof listingStatuses)[number];
export const publicListingStatuses: ListingStatus[] = ['available', 'reserved'];
export const listingStatusOptions: Array<{ value: ListingStatus; label: string }> = listingStatuses.map((status) => ({
  value: status,
  label: listingStatusLabel(status),
}));

export function listingStatusesForType(listingType: string | null | undefined) {
  return listingStatuses.filter((status) => {
    if (listingType === 'sale') return status !== 'rented';
    if (listingType === 'rent' || listingType === 'rental') return status !== 'sold';
    return true;
  });
}

export function listingStatusLabel(status: string | null, listingType?: string | null) {
  if (status === 'available') return listingType === 'rent' || listingType === 'rental' ? 'متاح للإيجار' : 'متاح للبيع';
  const labels: Record<string, string> = { reserved: 'محجوز', sold: 'تم البيع', rented: 'تم التأجير', pending_review: 'قيد المراجعة', temporarily_unavailable: 'موقوف مؤقتًا', unavailable: 'غير متاح', archived: 'مؤرشف', withdrawn: 'تم سحب العرض' };
  return status ? labels[status] ?? 'غير محدد' : 'غير محدد';
}

export function listingStatusClass(status: string | null) {
  return ({ available: 'status-badge--available', reserved: 'status-badge--reserved', sold: 'status-badge--closed', rented: 'status-badge--closed', pending_review: 'status-badge--review', temporarily_unavailable: 'status-badge--paused', unavailable: 'status-badge--paused', archived: 'status-badge--archived', withdrawn: 'status-badge--archived' } as Record<string, string>)[status ?? ''] ?? 'status-badge--archived';
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A single, defensive currency formatter for every customer-facing price. */
export function formatEgp(value: number | string | null | undefined, suffix = 'ج.م') {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return 'السعر غير متاح';
  return `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(amount)} ${suffix}`;
}

export function formatMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
}

export function listingTypeLabel(type: string | null) {
  if (type === 'rent') return 'إيجار';
  if (type === 'sale') return 'بيع';
  return 'إعلان';
}

export function getVehicleImageUrl(listing: Pick<VehicleListing, 'image_url'>, fallback = '/brand/alqirsh-icon.png') {
  return listing.image_url || fallback;
}
