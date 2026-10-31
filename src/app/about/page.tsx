import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, BusFront, CarFront, Compass, ShieldCheck, Wrench } from 'lucide-react';
import { PublicInfoPage } from '@/components/public-info-page';
import { localizedMetadata } from '@/lib/metadata';
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({
  title: 'من نحن', description: 'تعرّف على منصة القِرش ورسالتها في جمع عروض العقارات والسيارات للبيع والإيجار في مكان واحد.',
  alternates: { canonical: '/about' }, openGraph: { type: 'website', title: 'من نحن | القِرش', description: 'تعرّف على منصة القِرش وخدماتها.' },
});
}


const values = [
  { icon: Building2, title: 'عروض العقارات', text: 'استكشف العقارات المتاحة للبيع أو الإيجار وتعرّف على تفاصيل كل عرض.' },
  { icon: CarFront, title: 'عروض السيارات', text: 'تصفح السيارات المعروضة للبيع أو الإيجار وفق المعلومات المنشورة.' },
  { icon: BusFront, title: 'رحلات الباص', text: 'استعرض الرحلات المنشورة، وتعرّف على المقاعد والأسعار وخطوات الحجز المعروضة لكل رحلة.' },
  { icon: Wrench, title: 'أدوات إدارة الأملاك', text: 'تتضمن لوحة الإدارة أدوات داخلية لإدارة العقارات والوحدات والعقود والصيانة والمدفوعات بحسب صلاحيات الحساب.' },
  { icon: ShieldCheck, title: 'وضوح المعلومات', text: 'نعرض تفاصيل كل عرض وخطوات التواصل أو الحجز التي يدعمها الموقع، دون افتراض شروط غير منشورة.' },
];

export default function AboutPage() {
  return <PublicInfoPage eyebrow="عن القِرش" title="منصة واحدة لاستكشاف العقارات والسيارات ورحلات الباص" intro="القِرش منصة رقمية تساعدك على استكشاف عروض العقارات والسيارات للبيع أو الإيجار، ومراجعة رحلات الباص المنشورة وحجز المقاعد عندما تكون الرحلة متاحة للحجز. تظهر تفاصيل كل عرض أو رحلة وفق المعلومات المسجلة فيها." sections={[
    { title: 'رؤيتنا', content: <p>أن تكون تجربة البحث عن عقار أو سيارة أوضح وأسهل، عبر عرض المعلومات المتاحة بطريقة منظمة.</p> },
    { title: 'رسالتنا وأهدافنا', content: <><p>نوفر مساحة رقمية لاستعراض العروض وربط المهتمين بمعلومات التواصل المنشورة لكل عرض، بحسب البيانات المتاحة.</p><p>نسعى إلى تحسين سهولة الوصول إلى تفاصيل العروض، ودعم تجربة استخدام عربية مناسبة للأجهزة المختلفة.</p></> },
    { title: 'الخدمات والوظائف المتاحة', content: <><p>تتيح الصفحات العامة استعراض العقارات والسيارات المنشورة للبيع أو الإيجار، وفتح تفاصيل كل عرض للتواصل بشأنه. كما تعرض صفحة الرحلات مواعيد الباصات والمقاعد المتاحة وخطوات الحجز والدفع المعتمدة للرحلة.</p><p>تحتوي لوحة الإدارة على أدوات داخلية لإدارة الأملاك، مثل العقارات والوحدات والمستأجرين والعقود والصيانة والمدفوعات. الوصول إلى هذه الأدوات محصور بالحسابات التي تملك صلاحيات مناسبة.</p><p>قد تختلف شروط التقسيط أو الدفع بحسب العرض؛ لا تنشر المنصة جدول تمويل موحدًا. ولا توجد في الموقع حاليًا صفحات عامة مستقلة لطلب التشطيبات أو المقاولات أو الاستثمار، لذا يرجى التواصل مع الفريق للتحقق من أي استفسار متعلق بها.</p></> },
    { title: 'المساعد الذكي', content: <p>يمكنك استخدام المساعد الظاهر على صفحات الموقع للبحث عن عروض العقارات والسيارات، ومعرفة معلومات عامة عن المنصة، والوصول إلى صفحات التواصل والأسئلة الشائعة. يعتمد المساعد على البيانات المنشورة ولا يؤكد شروطًا غير معروضة.</p> },
  ]}>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">{values.map(({ icon: Icon, title, text }) => <article key={title} className="panel rounded-2xl p-5"><Icon className="text-[var(--brand)]" size={24}/><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{text}</p></article>)}</section>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/properties" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-bold text-white"><Building2 size={17}/>تصفح العقارات</Link><Link href="/cars" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-5 text-sm font-bold"><CarFront size={17}/>تصفح السيارات</Link><Link href="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-5 text-sm font-bold"><Compass size={17}/>تواصل معنا</Link></div>
    <div className="mt-3 flex flex-wrap gap-3"><Link href="/trips" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-5 text-sm font-bold"><BusFront size={17}/>استعرض رحلات الباص</Link></div>
  </PublicInfoPage>;
}
