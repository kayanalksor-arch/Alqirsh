import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicInfoPage } from '@/components/public-info-page';

export const metadata: Metadata = { title: 'الأسئلة الشائعة', description: 'إجابات عن البحث في العقارات والسيارات واستخدام الحسابات ونشر العروض على منصة القِرش.', alternates: { canonical: '/faq' }, openGraph: { type: 'website', title: 'الأسئلة الشائعة | القِرش' } };

const groups = [
  { title: 'العقارات', questions: [
    { question: 'كيف أبحث عن عقار للبيع؟', answer: <>انتقل إلى <Link className="font-bold text-[var(--brand)] underline" href="/properties/sale">عقارات للبيع</Link> واستخدم خيارات البحث والتصفية المتاحة.</> },
    { question: 'كيف أبحث عن عقار للإيجار؟', answer: <>تصفح <Link className="font-bold text-[var(--brand)] underline" href="/properties/rent">عقارات للإيجار</Link> ثم افتح العرض للاطلاع على تفاصيله.</> },
    { question: 'كيف أتواصل بشأن عقار؟', answer: <>راجع معلومات العرض ثم استخدم وسيلة التواصل المنشورة أو صفحة <Link className="font-bold text-[var(--brand)] underline" href="/contact">تواصل معنا</Link> إذا احتجت مساعدة.</> },
    { question: 'ماذا أفعل إذا وجدت معلومات غير صحيحة؟', answer: <>أرسل رابط العرض وشرحًا مختصرًا عبر <Link className="font-bold text-[var(--brand)] underline" href="/report-issue">صفحة الإبلاغ</Link>.</> },
  ] },
  { title: 'السيارات', questions: [
    { question: 'كيف أبحث عن سيارة للبيع؟', answer: <>افتح <Link className="font-bold text-[var(--brand)] underline" href="/cars/sale">سيارات للبيع</Link> واستعرض النتائج المتاحة.</> },
    { question: 'كيف أبحث عن سيارة للإيجار؟', answer: <>افتح <Link className="font-bold text-[var(--brand)] underline" href="/cars/rent">سيارات للإيجار</Link>. وتظهر الحجوزات وخياراتها بحسب العرض والوظائف المتاحة.</> },
    { question: 'كيف أستفسر عن سيارة؟', answer: <>راجع صفحة تفاصيل السيارة، ثم استخدم وسيلة التواصل المتاحة أو صفحة التواصل العامة.</> },
    { question: 'كيف أبلغ عن عرض غير صحيح؟', answer: <>أرسل رابط السيارة وسبب البلاغ عبر <Link className="font-bold text-[var(--brand)] underline" href="/report-issue">صفحة الإبلاغ عن مشكلة</Link>.</> },
  ] },
  { title: 'الحسابات والاستخدام', questions: [
    { question: 'كيف أنشئ حسابًا؟', answer: <>صفحة الدخول الحالية مخصصة لتسجيل الدخول؛ إذا لم يكن لديك حساب أو لم تتمكن من الدخول، تواصل مع فريق القِرش.</> },
    { question: 'كيف أتواصل مع فريق القِرش؟', answer: <>تجد رقم الهاتف الرسمي القابل للتحديث في <Link className="font-bold text-[var(--brand)] underline" href="/contact">صفحة التواصل</Link>.</> },
    { question: 'كيف أطلب تعديل بياناتي أو معالجتها؟', answer: <>أرسل طلبك عبر صفحة التواصل، واذكر البيانات أو الحساب المقصود. لطلبات الخصوصية، وضح ذلك في الرسالة.</> },
    { question: 'كيف أطلب معالجة مشكلة تتعلق بالخصوصية؟', answer: <>استخدم وسيلة التواصل الرسمية مع توضيح أن الطلب متعلق بالخصوصية، ولا ترسل كلمة المرور أو بيانات حساسة.</> },
  ] },
  { title: 'الملاك والمعلنون', questions: [
    { question: 'كيف يمكنني عرض عقار أو سيارة؟', answer: <>تخضع إضافة العروض لصلاحية الحساب وآلية المنصة الحالية. إذا لم تظهر لك أدوات الإضافة، تواصل معنا للاستفسار.</> },
    { question: 'كيف أعدّل بيانات العرض؟', answer: <>يمكن للحساب المخول استخدام أدوات الإدارة المتاحة. عند تعذر التعديل، أرسل رابط العرض عبر صفحة التواصل.</> },
    { question: 'كيف أحدّث حالة العرض؟', answer: <>حدّث الحالة من أدوات الإدارة إذا كانت متاحة لحسابك؛ وإلا أرسل طلبًا يتضمن رابط العرض والحالة الصحيحة.</> },
  ] },
];

export default function FaqPage() {
  return <PublicInfoPage eyebrow="المساعدة" title="الأسئلة الشائعة" intro="إجابات موجزة تساعدك على استخدام أقسام العقارات والسيارات والتواصل مع القِرش." >
    <div className="mt-6 grid gap-5">{groups.map((group) => <section key={group.title} className="panel rounded-2xl p-5 sm:p-7"><h2 className="text-xl font-black">{group.title}</h2><div className="mt-4 divide-y divide-[var(--line)]">{group.questions.map(({ question, answer }) => <details key={question} className="group py-3"><summary className="cursor-pointer list-none rounded-lg py-2 font-bold marker:hidden focus-visible:outline-2 focus-visible:outline-[var(--focus)] focus-visible:outline-offset-2"><span className="flex items-center justify-between gap-3">{question}<span aria-hidden="true" className="text-xl text-[var(--brand)] group-open:rotate-45">+</span></span></summary><div className="pb-2 pt-1 text-sm leading-7 text-[var(--muted)]">{answer}</div></details>)}</div></section>)}</div>
  </PublicInfoPage>;
}
