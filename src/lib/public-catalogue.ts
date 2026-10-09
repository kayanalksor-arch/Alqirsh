import { cache } from 'react';
import { createPublicClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { indexableListingStatuses, publicListingStatuses } from '@/lib/listings';

export type PublicCar = {
  id: string; title: string; description: string | null; listing_type: 'sale' | 'rent';
  brand: string | null; model: string | null; variant: string | null; year: number | null;
  price: number | null; daily_price: number | null; weekly_price: number | null; monthly_price: number | null;
  location: string | null; fuel_type: string | null; transmission: string | null; mileage: number | null;
  color: string | null; image_url: string | null; status: string | null; condition: string | null; created_at: string | null;
};

export type PublicProperty = {
  id: string; title: string; description: string | null; property_type: string | null; price: number | null;
  location: string | null; address: string | null; map_url: string | null; area: number | null;
  bedrooms: number | null; bathrooms: number | null; facade: string | null; status: string | null; updated_at?: string | null;
};

export type PublicPropertyCard = PublicProperty & { listingType: 'sale' | 'rental'; images: string[] };

const publicStatuses = [...publicListingStatuses];

export const getPublicCar = cache(async (id: string): Promise<PublicCar | null> => {
  if (!isSupabaseConfigured) return null;
  const db = createPublicClient();
  const { data, error } = await db.from('vehicle_listings')
    .select('id,title,description,listing_type,brand,model,variant,year,price,daily_price,weekly_price,monthly_price,location,fuel_type,transmission,mileage,color,image_url,status,condition,created_at')
    .eq('id', id).in('status', publicStatuses).maybeSingle();
  if (error) throw error;
  return data as PublicCar | null;
});

export const getPublicPropertyPageData = cache(async (id: string, listingType: 'sale' | 'rental'): Promise<{ property: PublicProperty; images: string[] } | null> => {
  if (!isSupabaseConfigured) return null;
  const db = createPublicClient();
  const table = listingType === 'rental' ? 'rental_offers' : 'sale_offers';
  const { data, error } = await db.from(table)
    .select('id,title,description,property_type,price,location,address,map_url,area,bedrooms,bathrooms,facade,status,updated_at')
    .eq('id', id).in('status', publicStatuses).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: media, error: mediaError } = await db.from('property_images')
    .select('image_url,image_path,sort_order').eq('property_id', id).eq('property_type', listingType).order('sort_order');
  if (mediaError) throw mediaError;
  const images = (media ?? []).map((image) => image.image_url || db.storage.from('listing-images').getPublicUrl(image.image_path).data.publicUrl);
  return { property: data as PublicProperty, images };
});

export async function getPublicCars(view: 'all' | 'sale' | 'rent'): Promise<PublicCar[]> {
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  let query = db.from('vehicle_listings')
    .select('id,title,description,listing_type,brand,model,variant,year,price,daily_price,weekly_price,monthly_price,location,fuel_type,transmission,mileage,color,image_url,status,condition,created_at')
    .in('status', publicStatuses).order('created_at', { ascending: false });
  if (view !== 'all') query = query.eq('listing_type', view);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PublicCar[];
}

export async function getPublicProperties(view: 'all' | 'sale' | 'rent'): Promise<PublicPropertyCard[]> {
  if (!isSupabaseConfigured) return [];
  const db = createPublicClient();
  const types = view === 'all' ? ['sale', 'rental'] as const : [view === 'rent' ? 'rental' : 'sale'] as const;
  const groups = await Promise.all(types.map(async (type) => {
    const table = type === 'rental' ? 'rental_offers' : 'sale_offers';
    const { data, error } = await db.from(table)
      .select('id,title,description,property_type,price,location,address,map_url,area,bedrooms,bathrooms,facade,status,updated_at')
      .in('status', publicStatuses).order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as PublicProperty[];
    const ids = rows.map((row) => row.id);
    let images: { property_id: string; image_url: string | null; image_path: string | null; sort_order: number | null }[] = [];
    if (ids.length) {
      const { data: media, error: mediaError } = await db.from('property_images')
        .select('property_id,image_url,image_path,sort_order').eq('property_type', type).in('property_id', ids).order('sort_order');
      if (mediaError) throw mediaError;
      images = media ?? [];
    }
    const byProperty = new Map<string, string[]>();
    for (const item of images) {
      const image = item.image_url || (item.image_path ? db.storage.from('listing-images').getPublicUrl(item.image_path).data.publicUrl : null);
      if (image) byProperty.set(item.property_id, [...(byProperty.get(item.property_id) ?? []), image]);
    }
    return rows.map((row) => ({ ...row, listingType: type, images: byProperty.get(row.id) ?? [] }));
  }));
  return groups.flat();
}

export async function getIndexableListings() {
  if (!isSupabaseConfigured) return { properties: [], cars: [] };
  const db = createPublicClient();
  const statuses = [...indexableListingStatuses];
  const fetchAll = async (table: 'sale_offers' | 'rental_offers' | 'vehicle_listings') => {
    const batchSize = 1000;
    const rows: { id: string; updated_at: string | null }[] = [];
    for (let from = 0; ; from += batchSize) {
      const { data, error } = await db.from(table).select('id,updated_at')
        .in('status', statuses).order('id').range(from, from + batchSize - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < batchSize) return rows;
      if (rows.length >= 50_000) throw new Error(`The ${table} sitemap exceeds Google's 50,000 URL limit.`);
    }
  };
  const [sales, rentals, cars] = await Promise.all([
    fetchAll('sale_offers'), fetchAll('rental_offers'), fetchAll('vehicle_listings'),
  ]);
  return {
    properties: [
      ...sales.map((item) => ({ ...item, listingType: 'sale' as const })),
      ...rentals.map((item) => ({ ...item, listingType: 'rental' as const })),
    ],
    cars,
  };
}

