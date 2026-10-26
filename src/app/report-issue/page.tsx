import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Phone } from 'lucide-react';
import { PublicInfoPage } from '@/components/public-info-page';
import { ContactCard } from '@/components/contact-card';
import { localizedMetadata } from '@/lib/metadata';
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({ title: 'الإبلاغ عن مشكلة', description: 'تعرف على طريقة التواصل مع القِرش للإبلاغ عن عرض غير صحيح أو مشكلة في الموقع أو طلب خصوصية.', alternates: { canonical: '/report-issue' }, openGraph: { type: 'website', title: 'الإبلاغ عن مشكلة | القِرش' } });
}


export default function ReportIssuePage() {
  return <PublicInfoPage eyebrow="المساعدة" title="الإبلاغ عن مشكلة" intro="يمكنك التواصل مع فريق القِرش للإبلاغ عن إعلان غير صحيح أو صورة مخالفة أو مشكلة في استخدام الموقع أو مسألة تتعلق بالخصوصية." sections={[
    { title: 'ما الذي ترسله؟', content: <><p>أرسل رابط الصفحة أو معرّف العرض، واشرح المشكلة باختصار. أرفق تفاصيل تساعد على فهمها، وتجنب إرسال كلمات المرور أو بيانات شخصية لا تلزم للبلاغ.</p><p>لا تكشف المنصة هوية المبلّغ لصاحب الإعلان كجزء من صفحة العرض. وقد نحتاج إلى معالجة بيانات التواصل التي تختار إرسالها للرد على البلاغ.</p></> },
    { title: 'طريقة الإرسال', content: <p>استخدم رقم التواصل الرسمي الظاهر أدناه. هذه الصفحة لا ترسل نموذجًا إلكترونيًا ولا تعرض تأكيدًا باستلام البلاغ؛ اعتبر البلاغ مرسلًا بعد التواصل الفعلي مع الفريق.</p> },
  ]}>
    <section className="mt-6 rounded-2xl border border-[var(--info-border)] bg-[var(--info-surface)] p-5 text-[var(--info-foreground)]"><p className="flex items-center gap-2 font-black"><AlertCircle size={20}/>للإبلاغ عن عرض محدد</p><p className="mt-2 text-sm leading-7">انسخ رابط العرض من شريط العنوان وأرسله مع سبب البلاغ. للمساعدة في طلبات الخصوصية، اكتب بوضوح أن استفسارك متعلق بالخصوصية.</p><Link href="/contact" className="mt-3 inline-flex min-h-10 items-center gap-2 font-bold underline">الانتقال إلى صفحة التواصل <ArrowLeft size={16}/></Link></section>
    <div className="mt-6"><ContactCard /></div>
    <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[var(--muted)]"><Phone size={15}/>لا تُرسل معلومات سرية أو كلمات مرور عبر الهاتف.</p>
  </PublicInfoPage>;
}
