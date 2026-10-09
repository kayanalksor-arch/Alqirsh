import type { MetadataRoute } from 'next';
import { getIndexableListings } from '@/lib/public-catalogue';

const base = 'https://alqirsh.online';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    '/', '/properties', '/properties/sale', '/properties/rent',
    '/cars', '/cars/sale', '/cars/rent', '/partners', '/contact',
  ].map((path) => ({ url: `${base}${path}` }));

  try {
    const { properties, cars } = await getIndexableListings();
    const details: MetadataRoute.Sitemap = [
      ...properties.map((item) => ({
        url: `${base}/properties/${item.id}${item.listingType === 'rental' ? '?type=rental' : ''}`,
        ...(item.updated_at ? { lastModified: item.updated_at } : {}),
      })),
      ...cars.map((item) => ({
        url: `${base}/cars/${item.id}`,
        ...(item.updated_at ? { lastModified: item.updated_at } : {}),
      })),
    ];
    const unique = new Map([...pages, ...details].map((entry) => [entry.url, entry]));
    return [...unique.values()];
  } catch (error) {
    console.error('Could not generate the public sitemap from Supabase.', error);
    throw new Error('Sitemap generation failed.');
  }
}
