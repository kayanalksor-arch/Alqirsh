import type { MetadataRoute } from 'next';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { publicListingStatuses } from '@/lib/listings';
const base = 'https://alqirsh.online';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/sales', '/rentals', '/cars', '/cars/sale', '/cars/rent', '/partners', '/contact'].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: path === '' ? 1 : 0.7 }));
  if (!isSupabaseConfigured) return pages;
  try {
    const db = await createClient();
    const [sales, rentals, cars] = await Promise.all([
      db.from('sale_offers').select('id,updated_at').in('status', publicListingStatuses),
      db.from('rental_offers').select('id,updated_at').in('status', publicListingStatuses),
      db.from('vehicle_listings').select('id,updated_at').in('status', publicListingStatuses),
    ]);
    return [...pages, ...(sales.data ?? []).map((item) => ({ url: `${base}/properties/${item.id}`, lastModified: item.updated_at ?? undefined, priority: 0.6 })), ...(rentals.data ?? []).map((item) => ({ url: `${base}/properties/${item.id}?type=rental`, lastModified: item.updated_at ?? undefined, priority: 0.6 })), ...(cars.data ?? []).map((item) => ({ url: `${base}/cars/${item.id}`, lastModified: item.updated_at ?? undefined, priority: 0.6 }))];
  } catch { return pages; }
}
