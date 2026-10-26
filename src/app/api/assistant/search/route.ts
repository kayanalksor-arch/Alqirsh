import { NextResponse } from 'next/server';
import { getPublicCars, getPublicProperties } from '@/lib/public-catalogue';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Locale = 'ar' | 'en';
type Kind = 'property' | 'car';
type View = 'all' | 'sale' | 'rent';

const normalize = (value: string) => value
  .toLowerCase()
  .replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
  .replace(/[أإآ]/gu, 'ا')
  .replace(/ى/gu, 'ي')
  .replace(/[٠-٩]/gu, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[^\p{L}\p{N}.]+/gu, ' ')
  .trim();

const normalizePlace = (value: string) => normalize(value)
  .replace(/^(?:مركز|مدينه|مدينة|حي|منطقه|منطقة|محافظه|محافظة)\s+/u, '')
  .replace(/(?:\s+مركز|\s+مدينه|\s+مدينة|\s+حي|\s+منطقه|\s+منطقة)$/u, '')
  .trim();

const numberFrom = (value: string) => {
  const normalized = normalize(value).replace(/,/gu, '');
  const match = normalized.match(/(?:ميزاني(?:ة|تي)|حدود|بحدود|اقل من|تحت|سعر حتى|budget|under|up to|max(?:imum)?)\s*(?:حوالي\s*)?(\d+(?:\.\d+)?)\s*(مليون|ملايين|million|الف|ألف|thousand|k)?/u);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2] ?? '';
  if (!Number.isFinite(amount)) return null;
  return amount * (/مليون|ملايين|million/u.test(unit) ? 1_000_000 : /الف|ألف|thousand|k/u.test(unit) ? 1_000 : 1);
};

const propertyTypes = [
  { names: ['شقة', 'شقق', 'apartment', 'flat'], value: 'apartment' },
  { names: ['فيلا', 'فيلات', 'villa'], value: 'villa' },
  { names: ['ارض', 'أرض', 'land', 'plot'], value: 'land' },
  { names: ['محل', 'محل تجاري', 'shop', 'store'], value: 'shop' },
  { names: ['مكتب', 'مكتب اداري', 'مكتب إداري', 'office'], value: 'office' },
];

const stopWords = new Set([
  'اريد', 'عايز', 'عاوزه', 'ابحث', 'بحث', 'عن', 'في', 'من', 'الى', 'لي', 'محتاج', 'محتاجه', 'ممكن', 'هل', 'يوجد', 'توجد', 'عندي', 'مع', 'بس',
  'عقار', 'عقارات', 'شقه', 'شقه', 'سياره', 'سيارات', 'property', 'properties', 'car', 'cars', 'search', 'find', 'looking', 'for', 'the',
  'شراء', 'شراءه', 'بيع', 'للبيع', 'ايجار', 'للايجار', 'rent', 'rental', 'sale', 'buy', 'new', 'used', 'مستعمل', 'جديد', 'استثمار', 'استثماري',
  'ميزانيه', 'حدود', 'بحدود', 'اقل', 'من', 'جنيه', 'جنيهات', 'egp', 'budget', 'under', 'up', 'to', 'max', 'million', 'مليون', 'ملايين', 'الف', 'ألف',
  'غرف', 'غرفه', 'غرفتين', 'غرفة', 'نوم', 'مساحه', 'مساحة', 'متر', 'مترمربع', 'm2', 'sqm', 'كيلو', 'كم', 'كمتر', 'km', 'موديل', 'سنه', 'سنة', 'السنه', 'السنة',
  'propertyfor', 'propertiesfor', 'carsfor', 'vehicle', 'vehicles', 'want', 'looking', 'please', 'find', 'search',
]);

function detectedView(query: string, fallback: View): View {
  const q = normalize(query);
  if (/للايجار|ايجار|استئجار|rent|rental|lease/u.test(q)) return 'rent';
  if (/للبيع|شراء|شراءه|بيع|buy|sale|purchase/u.test(q)) return 'sale';
  return fallback;
}

function scoreQuery(query: string, values: Array<string | number | null | undefined>) {
  const searchable = normalize(values.filter((value) => value != null).join(' '));
  const normalizedQuery = normalize(query).replace(/(?:عقار|عقارات|properties?|سيارات|سيارة|cars?|vehicles?)\s+(?:ل|for)\s*(?:للايجار|ايجار|الايجار|الإيجار|البيع|بيع|sale|rent)/gu, ' ');
  const words = normalizedQuery.split(' ').filter((word) => word.length > 1 && !stopWords.has(word));
  return words.reduce((score, word) => searchable.includes(word) ? score + (word.length > 3 ? 2 : 1) : score, 0);
}

function hasSpecificTerms(query: string) {
  return Boolean(locationQuery(query)) || Boolean(numberFrom(query)) || /\d+\s*(?:غرف|غرفه|غرفة|bedrooms?|rooms?|متر|sqm|m2)/u.test(normalize(query));
}

function matchesLocation(query: string, location: string | null) {
  if (!location) return false;
  const words = locationQuery(query).split(' ').filter(Boolean);
  if (!words.length) return false;
  const normalizedLocation = normalizePlace(location);
  return words.every((word) => normalizedLocation.includes(word));
}

function locationQuery(query: string) {
  const queryWithoutPlaceFilter = normalizePlace(query).replace(/(?:في|بمنطقة|منطقة|بمدينة|مدينة|in|near|around)\s+/gu, ' ');
  return queryWithoutPlaceFilter.split(' ').filter((word) => word.length > 1
    && !stopWords.has(word)
    && !propertyTypes.some((type) => type.names.some((name) => normalize(name).split(' ').includes(word) || normalize(name).includes(word)))
    && !/^(?:\d+|m2|sqm)$/u.test(word)).join(' ');
}

function translateKnownValue(value: string | null | undefined, locale: Locale) {
  if (!value) return value ?? null;
  const variants: Record<string, string> = {
    sedan: 'سيدان', suv: 'دفع رباعي', truck: 'شاحنة', van: 'فان', motorcycle: 'دراجة نارية',
    automatic: 'أوتوماتيك', auto: 'أوتوماتيك', manual: 'يدوي', petrol: 'بنزين', gasoline: 'بنزين', diesel: 'ديزل', electric: 'كهرباء', hybrid: 'هجين',
    used: 'مستعمل', new: 'جديد', apartment: 'شقة', villa: 'فيلا', house: 'منزل', land: 'أرض', office: 'مكتب', shop: 'محل',
    white: 'أبيض', black: 'أسود', red: 'أحمر', blue: 'أزرق', silver: 'فضي', gold: 'ذهبي', gray: 'رمادي', grey: 'رمادي', green: 'أخضر', brown: 'بني', yellow: 'أصفر',
  };
  if (locale === 'en') return variants[value.trim().toLowerCase()] ?? value;
  const arabicToEnglish: Record<string, string> = {
    'سيدان': 'Sedan', 'دفع رباعي': 'SUV', 'شاحنة': 'Truck', 'فان': 'Van', 'دراجة نارية': 'Motorcycle',
    'أوتوماتيك': 'Automatic', 'اوتوماتيك': 'Automatic', 'يدوي': 'Manual', 'بنزين': 'Gasoline', 'ديزل': 'Diesel', 'كهرباء': 'Electric', 'هجين': 'Hybrid',
    'مستعمل': 'Used', 'مستعملة': 'Used', 'جديد': 'New', 'جديدة': 'New', 'شقة': 'Apartment', 'شقه': 'Apartment', 'فيلا': 'Villa', 'أرض': 'Land', 'ارض': 'Land', 'مكتب': 'Office', 'محل': 'Shop',
    'أبيض': 'White', 'أسود': 'Black', 'أحمر': 'Red', 'أزرق': 'Blue', 'فضي': 'Silver', 'ذهبي': 'Gold', 'رمادي': 'Gray', 'أخضر': 'Green', 'بني': 'Brown', 'أصفر': 'Yellow',
  };
  return arabicToEnglish[value.trim()] ?? value;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 4_096) return NextResponse.json({ error: 'request_too_large' }, { status: 413 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const payload = body as Record<string, unknown>;
  const query = typeof payload.query === 'string' ? payload.query.trim().slice(0, 400) : '';
  const kind: Kind | null = payload.kind === 'property' || payload.kind === 'car' ? payload.kind : null;
  const locale: Locale = payload.locale === 'en' ? 'en' : 'ar';
  const fallbackView: View = payload.view === 'sale' || payload.view === 'rent' ? payload.view : 'all';
  if (!kind) return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'catalogue_unavailable' }, { status: 503 });

  try {
    const view = detectedView(query, fallbackView);
    const budget = numberFrom(query);
    const requestedType = kind === 'property'
      ? propertyTypes.find((item) => item.names.some((name) => normalize(query).includes(normalize(name)))) ?? null
      : null;
    const bedroomMatch = kind === 'property' ? normalize(query).match(/(\d+)\s*(?:غرف|غرفه|غرفة|bedrooms?|rooms?)/u) : null;
    const areaMatch = kind === 'property' ? normalize(query).match(/(\d+)\s*(?:متر|sqm|m2)/u) : null;
    const requestedCondition = kind === 'car'
      ? (/مستعمل|used/u.test(normalize(query)) ? 'used' : /جديد|new/u.test(normalize(query)) ? 'new' : null)
      : null;
    const locationFilter = locationQuery(query);

    const specificTerms = hasSpecificTerms(query);
    const [allProperties, allCars] = kind === 'property'
      ? [await getPublicProperties('all'), [] as Awaited<ReturnType<typeof getPublicCars>>]
      : [[], await getPublicCars('all')];

    const results = kind === 'property'
      ? allProperties
        .filter((item) => view === 'all' || (view === 'rent' ? item.listingType === 'rental' : item.listingType === 'sale'))
        .filter((item) => !requestedType || requestedType.names.some((name) => normalize(item.property_type ?? '').includes(normalize(name))) || normalize(item.property_type ?? '').includes(normalize(requestedType.names[0])))
        .filter((item) => budget == null || (item.price != null && item.price <= budget))
        .filter((item) => !bedroomMatch || (item.bedrooms != null && item.bedrooms >= Number(bedroomMatch[1])))
        .filter((item) => !areaMatch || (item.area != null && item.area >= Number(areaMatch[1])))
        .filter((item) => !locationFilter || matchesLocation(locationFilter, item.location ?? item.address))
        .map((item) => ({
          kind, id: item.id, title: item.title, image: item.images[0] ?? null,
          href: `/properties/${item.id}${item.listingType === 'rental' ? '?type=rental' : ''}`,
          price: item.price, priceUnit: item.listingType === 'rental' ? 'month' : null,
          location: item.location ?? item.address, propertyType: translateKnownValue(item.property_type, locale), area: item.area, bedrooms: item.bedrooms, bathrooms: item.bathrooms,
        }))
        .map((item) => ({ item, score: scoreQuery(query, [item.title, item.location, item.propertyType, ...(requestedType?.names ?? [])]), locationMatch: matchesLocation(query, item.location) }))
        .filter(({ score, locationMatch }) => !specificTerms || score > 0 || locationMatch)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ item }) => item)
      : allCars
        .filter((item) => view === 'all' || (view === 'rent' ? item.listing_type === 'rent' : item.listing_type === 'sale'))
        .filter((item) => !requestedCondition || normalize(item.condition ?? '').includes(requestedCondition))
        .filter((item) => !locationFilter || matchesLocation(locationFilter, item.location))
        .filter((item) => budget == null || ((item.price ?? item.daily_price ?? item.weekly_price ?? item.monthly_price) != null && (item.price ?? item.daily_price ?? item.weekly_price ?? item.monthly_price)! <= budget))
        .map((item) => ({
          kind, id: item.id, title: [item.brand, item.model, item.year].filter(Boolean).join(' ') || item.title,
          image: item.image_url, href: `/cars/${item.id}`,
          price: item.listing_type === 'rent' ? (item.daily_price ?? item.weekly_price ?? item.monthly_price) : item.price,
          priceUnit: item.daily_price != null ? 'day' : item.weekly_price != null ? 'week' : item.monthly_price != null ? 'month' : null,
          location: item.location, year: item.year, mileage: item.mileage,
          transmission: translateKnownValue(item.transmission, locale), fuelType: translateKnownValue(item.fuel_type, locale), color: translateKnownValue(item.color, locale),
        }))
        .map((item) => ({ item, score: scoreQuery(query, [item.title, item.location, item.year]), locationMatch: matchesLocation(query, item.location) }))
        .filter(({ score, locationMatch }) => !specificTerms || score > 0 || locationMatch)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ item }) => item);

    return NextResponse.json({ kind, view, locale, results });
  } catch {
    return NextResponse.json({ error: 'catalogue_unavailable' }, { status: 503 });
  }
}
