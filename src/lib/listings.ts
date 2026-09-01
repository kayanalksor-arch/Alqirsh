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

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatMoney(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
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

export function listingStatusLabel(status: string | null) {
  switch (status) {
    case 'active':
      return 'نشط';
    case 'inactive':
      return 'غير نشط';
    case 'sold':
      return 'مباع';
    case 'archived':
      return 'مؤرشف';
    default:
      return status ?? 'غير محدد';
  }
}

export function getVehicleImageUrl(listing: Pick<VehicleListing, 'image_url'>, fallback = '/brand/alqirsh-icon.jpg') {
  return listing.image_url || fallback;
}
