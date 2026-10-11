import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, CarFront, Compass, ShieldCheck } from 'lucide-react';
import { PublicInfoPage } from '@/components/public-info-page';

export const metadata: Metadata = {
  title: 'من نحن', description: 'تعرّف على منصة القِرش ورسالتها في جمع عروض العقارات والسيارات للبيع والإيجار في مكان واحد.',
  alternates: { canonical: '/about' }, openGraph: { type: 'website', title: 'من نحن | القِرش', description: 'تعرّف على منصة القِرش وخدماتها.' },
};

const values = [
  { icon: Building2, title: 'عروض العقارات', text: 'استكشف العقارات المتاحة للبيع أو الإيجار وتعرّف على تفاصيل كل عرض.' },
  { icon: CarFront, title: 'عروض السيارات', text: 'تصفح السيارات المعروضة للبيع أو الإيجار وفق المعلومات المنشورة.' },
  { icon: ShieldCheck, title: 'وضوح المعلومات', text: 'نعمل على تقديم تجربة تساعد الزائر على الاطلاع على تفاصيل العرض قبل التواصل.' },
];

export default function AboutPage() {
  return <PublicInfoPage eyebrow="عن القِرش" title="نقرّب إليك خيارات العقارات والسيارات" intro="القِرش منصة رقمية تجمع عروض العقارات والسيارات في مكان واحد، لتسهيل استكشاف الخيارات المعروضة للبيع والإيجار والتواصل بشأنها." sections={[
    { title: 'رؤيتنا', content: <p>أن تكون تجربة البحث عن عقار أو سيارة أوضح وأسهل، عبر عرض المعلومات المتاحة بطريقة منظمة.</p> },
    { title: 'رسالتنا وأهدافنا', content: <><p>نوفر مساحة رقمية لاستعراض العروض وربط المهتمين بمعلومات التواصل المنشورة لكل عرض، بحسب البيانات المتاحة.</p><p>نسعى إلى تحسين سهولة الوصول إلى تفاصيل العروض، ودعم تجربة استخدام عربية مناسبة للأجهزة المختلفة.</p></> },
    { title: 'ما الذي تقدمه المنصة؟', content: <><p>يمكنك تصفح العقارات والسيارات المعروضة للبيع أو الإيجار، والاطلاع على تفاصيلها المنشورة. وتوفر المنصة كذلك قسمًا لإدارة الأملاك ضمن أدواتها الحالية.</p><p>تختلف تفاصيل التواصل والخطوات المتاحة بحسب العرض والخدمة، وتوضحها صفحات الموقع ذات الصلة.</p></> },
  ]}>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">{values.map(({ icon: Icon, title, text }) => <article key={title} className="panel rounded-2xl p-5"><Icon className="text-[var(--brand)]" size={24}/><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{text}</p></article>)}</section>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/properties" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold text-white"><Building2 size={17}/>تصفح العقارات</Link><Link href="/cars" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-5 text-sm font-bold"><CarFront size={17}/>تصفح السيارات</Link><Link href="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-5 text-sm font-bold"><Compass size={17}/>تواصل معنا</Link></div>
  </PublicInfoPage>;
}
