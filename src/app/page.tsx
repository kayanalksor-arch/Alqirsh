import Link from 'next/link';
import { ArrowLeft, Building2, KeyRound, Phone } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';

const actions = [
  ['/sales', 'عروض البيع', 'استعرض العقارات المعروضة للبيع بوضوح.', Building2],
  ['/rentals', 'عروض الإيجار', 'اكتشف الخيارات المتاحة للإيجار.', KeyRound],
  ['/contact', 'تواصل معنا', 'تواصل مباشرة مع فريق القِرش.', Phone],
] as const;

export default function Home() {
  return <main className="app-shell min-h-screen"><PublicHeader /><section className="mx-auto max-w-6xl px-5 py-10 lg:py-16"><div className="public-hero overflow-hidden rounded-[1.75rem] px-7 py-12 sm:px-10 lg:px-16 lg:py-20"><p className="public-hero-kicker text-sm font-bold">عقارات مصر، بثقة وبساطة</p><h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">ابحث عن عقارك المناسب بسهولة.</h1><p className="public-hero-copy mt-6 max-w-2xl leading-7">منصة القِرش تعرض العقارات المتاحة للبيع والإيجار، وتوفر مساحة داخلية احترافية لإدارة العقارات.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/sales" className="public-hero-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-bold">استعرض عروض البيع <ArrowLeft size={18} /></Link><Link href="/rentals" className="public-hero-secondary inline-flex min-h-12 items-center rounded-xl border px-5 font-bold">عروض الإيجار</Link></div></div><section className="mt-8 grid gap-5 md:grid-cols-3">{actions.map(([href, label, description, Icon]) => <Link key={href} href={href} className="panel group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-[var(--brand)]"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-[var(--brand)] dark:bg-emerald-950/50"><Icon size={22} /></span><h2 className="mt-6 text-xl font-black">{label}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]">اكتشف المزيد <ArrowLeft size={16} /></span></Link>)}</section></section></main>;
}
