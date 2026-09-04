import Link from 'next/link';
import { ArrowLeft, CalendarDays, CarFront, MapPin, Phone, Tag, Users } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { ImageLightbox } from '@/components/image-lightbox';
import { formatEgp } from '@/lib/listings';

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = isSupabaseConfigured ? await createClient() : null;

  if (!db) {
    return <main className="app-shell min-h-screen"><PublicHeader /><section className="mx-auto max-w-6xl px-5 py-10"><p className="eyebrow">السيارات</p><h1 className="mt-2 text-3xl font-black">تفاصيل السيارة</h1><div className="panel mt-8 rounded-2xl p-8 text-center">لا توجد بيانات بسبب عدم تهيئة Supabase.</div></section></main>;
  }

  const { data: listing, error } = await db
    .from('vehicle_listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !listing) {
    return <main className="app-shell min-h-screen"><PublicHeader /><section className="mx-auto max-w-6xl px-5 py-10"><p className="eyebrow">السيارات</p><h1 className="mt-2 text-3xl font-black">الرسالة</h1><div className="panel mt-8 rounded-2xl p-8 text-center">{error ? error.message : 'لم يتم العثور على السيارة المطلوبة.'}</div></section></main>;
  }

  const price = listing.listing_type === 'rent'
    ? (listing.daily_price ?? listing.weekly_price ?? listing.monthly_price ?? 0)
    : (listing.price ?? 0);

  const gallery = listing.image_url ? [listing.image_url] : [];

  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">تفاصيل السيارة</p>
            <h1 className="mt-2 text-3xl font-black">{listing.title}</h1>
          </div>
          <Link href={listing.listing_type === 'rent' ? '/cars/rent' : '/cars/sale'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            <ArrowLeft size={16} /> العودة
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="panel overflow-hidden rounded-[2rem] p-3">
            <ImageLightbox images={gallery} title={listing.title} />
          </article>

          <aside className="panel rounded-[2rem] p-5">
            <p className="text-xs font-bold text-[var(--brand)]">{listing.listing_type === 'rent' ? 'إيجار' : 'بيع'}</p>
            <h2 className="mt-3 text-2xl font-black">{formatEgp(price)}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{listing.location ?? 'الموقع غير محدد'}</p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>الماركة</span><b>{listing.brand ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>الموديل</span><b>{listing.model ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>السنة</span><b>{listing.year ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>الوقود</span><b>{listing.fuel_type ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span>ناقل الحركة</span><b>{listing.transmission ?? '—'}</b></div>
            </div>

            <a href={`tel:${(listing.contact_phone ?? '').replace(/\s+/g, '')}`} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 font-bold text-white">
              <Phone size={18} /> تواصل الآن
            </a>
          </aside>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="panel rounded-[2rem] p-6">
            <p className="eyebrow">الوصف</p>
            <p className="mt-4 leading-8 text-[var(--muted)]">{listing.description || 'لا يوجد وصف إضافي لهذا الإعلان.'}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">الفئة</p><p className="mt-1 font-bold">{listing.variant ?? 'غير محدد'}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">الكيلومترات</p><p className="mt-1 font-bold">{listing.mileage ? `${Number(listing.mileage).toLocaleString('ar-EG')} كم` : 'غير محدد'}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">اللون</p><p className="mt-1 font-bold">{listing.color ?? 'غير محدد'}</p></div>
              <div className="rounded-xl bg-[var(--canvas)] p-3"><p className="text-xs text-[var(--muted)]">حالة الإعلان</p><p className="mt-1 font-bold">{listing.status ?? 'نشط'}</p></div>
            </div>
          </article>

          <aside className="panel rounded-[2rem] p-6">
            <p className="eyebrow">معلومات الإعلان</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><CalendarDays size={16} /> تاريخ الإضافة</span><b>{listing.created_at ? new Date(listing.created_at).toLocaleDateString('ar-EG') : '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><MapPin size={16} /> الموقع</span><b>{listing.location ?? '—'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><CarFront size={16} /> حالة السيارة</span><b>{listing.condition ?? 'مستعملة'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><Users size={16} /> التواصل</span><b>{listing.contact_name ?? 'غير محدد'}</b></div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--canvas)] p-3"><span className="inline-flex items-center gap-2"><Tag size={16} /> السعر</span><b>{formatEgp(price)}</b></div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
