import Link from 'next/link';
import { PublicHeader } from '@/components/public-header';
import { PropertiesListingView } from '@/components/properties-listing-view';

export default function PropertiesPage() {
  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="page-container">
        {/* Header */}
        <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="eyebrow">القِرش | العقارات</p>
          <h1 className="mt-2 text-3xl font-black">العقارات</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">تصفح العقارات المعروضة للبيع والإيجار مع فلاتر وبحث متقدم.</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-[var(--line)]">
          <Link
            href="/properties"
            className="px-4 py-3 font-bold border-b-2 border-[var(--brand)] text-[var(--brand)]"
          >
            الكل
          </Link>
          <Link
            href="/properties/sale"
            className="px-4 py-3 font-bold text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            للبيع
          </Link>
          <Link
            href="/properties/rent"
            className="px-4 py-3 font-bold text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            للإيجار
          </Link>
        </div>

        {/* Listing View */}
        <PropertiesListingView view="all" />
      </section>
    </main>
  );
}
