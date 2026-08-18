import { PublicHeader } from '@/components/public-header';
import { PublicPartnerGallery } from '@/components/public-partner-gallery';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export default async function PartnersPage() {
  const db = isSupabaseConfigured ? await createClient() : null;
  const { data: partners, error } = db
    ? await db.from('partners').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(24)
    : { data: [], error: null };

  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 py-10">
        <p className="eyebrow">شركاء النجاح</p>
        <h1 className="mt-2 text-3xl font-black">تعرف على شركائنا الموثوقين</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">اضغط على أي شريك لمشاهدة التفاصيل الكاملة.</p>

        {error ? (
          <p className="panel mt-8 rounded-2xl p-6">تعذر تحميل الشركاء: {error.message}</p>
        ) : !partners?.length ? (
          <section className="panel mt-8 rounded-2xl p-10 text-center">لا توجد شركاء حالياً.</section>
        ) : (
          <PublicPartnerGallery partners={partners} />
        )}
      </section>
    </main>
  );
}
