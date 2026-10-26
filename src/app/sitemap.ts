import type { MetadataRoute } from 'next';
import { getIndexableListings } from '@/lib/public-catalogue';

const base = 'https://alqirsh.online';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    '/', '/partners', '/contact',
    '/about', '/privacy-policy', '/terms', '/cookie-policy',
    '/listing-policy', '/faq', '/report-issue', '/accessibility',
  ].map((path) => ({ url: `${base}${path}` }));

  try {
    const { properties, cars } = await getIndexableListings();
    const saleCount = properties.filter((item) => item.listingType === 'sale').length;
    const rentCount = properties.filter((item) => item.listingType === 'rental').length;
    const carSaleCount = cars.filter((item) => item.listing_type === 'sale').length;
    const carRentCount = cars.filter((item) => item.listing_type === 'rent').length;
    if (saleCount || rentCount) pages.push({ url: `${base}/properties` });
    if (saleCount) pages.push({ url: `${base}/properties/sale` });
    if (rentCount) pages.push({ url: `${base}/properties/rent` });
    if (carSaleCount || carRentCount) pages.push({ url: `${base}/cars` });
    if (carSaleCount) pages.push({ url: `${base}/cars/sale` });
    if (carRentCount) pages.push({ url: `${base}/cars/rent` });
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
    if (unique.size > 50_000) throw new Error('The indexable catalogue exceeds the 50,000 URL limit for one sitemap.');
    return [...unique.values()];
  } catch (error) {
    console.error('Could not generate the public sitemap from Supabase.', error);
    return pages;
  }
}
