import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Building2, CarFront, Phone, Users } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';

const actions = [
  ['/properties', 'العقارات', 'استعرض العقارات المتاحة للبيع والإيجار.', Building2],
  ['/cars', 'السيارات', 'اكتشف أحدث السيارات المعروضة في السوق.', CarFront],
  ['/contact', 'تواصل معنا', 'تواصل مباشرة مع فريق القِرش.', Phone],
] as const;

export default function Home() {
  return (
    <main className="app-shell min-h-screen">
      <PublicHeader />
      <section className="page-container">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[linear-gradient(135deg,#0d5649_0%,#0a463d_100%)] p-4 shadow-[0_30px_80px_rgba(6,60,46,0.35)] sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[1.75rem] border border-emerald-300/25 bg-emerald-950/30 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 text-white">
                <span className="text-sm font-semibold">شركاء النجاح</span>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.2)]" />
              </div>

              <div className="mt-6 flex items-center gap-4 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-950/40 p-4 shadow-inner shadow-white/5">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-2">
                  <Image src="/brand/alqirsh-icon.png" alt="شعار القِرش" width={64} height={64} className="h-full w-full rounded-xl object-cover" priority />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-100">منصة عقارية موثوقة</p>
                  <h2 className="mt-1 text-2xl font-black text-white">القِرش</h2>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-full border border-emerald-300/20 bg-emerald-950/40 px-3 py-2.5 shadow-inner shadow-white/5">
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white shadow-sm">
                  <Image src="/brand/shorouk-logo.png" alt="شعار مكتب الشروق" width={48} height={48} className="h-full w-full object-cover" priority />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-emerald-100">شريك</p>
                  <p className="text-sm font-black text-white">مكتب الشروق للأستشارات الهندسية </p>
                </div>
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-950/40 p-4 text-emerald-50">
                <p className="text-sm font-medium">مستوى خدمة احترافي، لمجموعة من الشركاء الموثوقين في السوق العقاري.</p>
              </div>

              <div className="mt-8 flex justify-center">
                <Link href="/partners" className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-600/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600/40">
                  عرض الشركاء <ArrowLeft size={16} />
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-center px-1 py-2 text-white">
              <div className="mb-4 inline-flex w-fit items-center gap-3 rounded-full border border-emerald-300/25 bg-emerald-950/30 px-4 py-2 text-sm font-bold text-emerald-100">
                <span className="grid size-2.5 place-items-center rounded-full bg-emerald-400" />
                القِرش
              </div>

              <h1 className="max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">القِرش — مكانك لاكتشاف العقارات والسيارات.</h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-emerald-50">
                منصة القِرش تجمع بين أفضل العقارات والسيارات المعروضة للبيع والإيجار في تجربة احترافية وسريعة ومريحة للمستخدمين.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/properties" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-600/20 px-5 font-bold text-white transition hover:bg-emerald-600/30">
                  عقارات <ArrowLeft size={18} />
                </Link>
                <Link href="/cars" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-600/20 px-5 font-bold text-white transition hover:bg-emerald-600/30">
                  سيارات
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/partners" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-600/30 px-5 font-bold text-emerald-50 transition hover:bg-emerald-600/40">
                  شركاء النجاح <ArrowLeft size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {actions.map(([href, label, description, Icon]) => (
            <Link key={href} href={href} className="panel group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-[var(--brand)]">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-[var(--brand)] dark:bg-emerald-950/50">
                <Icon size={22} />
              </span>
              <h2 className="mt-6 text-xl font-black">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]">
                اكتشف المزيد <ArrowLeft size={16} />
              </span>
            </Link>
          ))}

          <Link href="/partners" className="panel group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-[var(--brand)]">
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-[var(--brand)] dark:bg-emerald-950/50">
              <Users size={22} />
            </span>
            <h2 className="mt-6 text-xl font-black">شركاء النجاح</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">تعرف على شركائنا الموثوقين في النجاح.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]">
              عرض الشركاء <ArrowLeft size={16} />
            </span>
          </Link>
        </section>
      </section>
    </main>
  );
}
