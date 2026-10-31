import type { MetadataRoute } from 'next';
import { getIndexableListings } from '@/lib/public-catalogue';

const base = 'https://alqirsh.online';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/properties', priority: 0.9, changeFrequency: 'daily' },
    { path: '/properties/sale', priority: 0.8, changeFrequency: 'daily' },
    { path: '/properties/rent', priority: 0.8, changeFrequency: 'daily' },
    { path: '/cars', priority: 0.9, changeFrequency: 'daily' },
    { path: '/cars/sale', priority: 0.8, changeFrequency: 'daily' },
    { path: '/cars/rent', priority: 0.8, changeFrequency: 'daily' },
    { path: '/trips', priority: 0.8, changeFrequency: 'daily' },
    { path: '/partners', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/privacy-policy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/cookie-policy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/listing-policy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/accessibility', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/report-issue', priority: 0.2, changeFrequency: 'yearly' },
  ] as const;
  const pages: MetadataRoute.Sitemap = staticPages.map(({ path, priority, changeFrequency }) => ({ url: `${base}${path}`, priority, changeFrequency }));

  try {
    const { properties, cars } = await getIndexableListings();
    const details: MetadataRoute.Sitemap = [
      ...properties.map((item) => ({
        url: `${base}/properties/${item.id}${item.listingType === 'rental' ? '?type=rental' : ''}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        ...(item.updated_at ? { lastModified: item.updated_at } : {}),
      })),
      ...cars.map((item) => ({
        url: `${base}/cars/${item.id}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        ...(item.updated_at ? { lastModified: item.updated_at } : {}),
      })),
    ];
    const unique = new Map([...pages, ...details].map((entry) => [entry.url, entry]));
    if (unique.size > 50_000) throw new Error('The indexable catalogue exceeds the 50,000 URL limit for one sitemap.');
    return [...unique.values()];
  } catch (error) {
    console.error('Could not generate the public sitemap from Supabase.', error);
    return pages;
  }
}
