import type { Metadata } from 'next';
import { InfoList, PublicInfoPage } from '@/components/public-info-page';
import { localizedMetadata } from '@/lib/metadata';
export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata({ title: 'سياسة نشر العروض', description: 'قواعد نشر وتحديث والإبلاغ عن عروض العقارات والسيارات في منصة القِرش.', alternates: { canonical: '/listing-policy' }, openGraph: { type: 'article', title: 'سياسة نشر العروض | القِرش' } });
}


export default function ListingPolicyPage() {
  return <PublicInfoPage eyebrow="السياسات" title="سياسة نشر العروض" intro="تساعد هذه القواعد على إبقاء العروض المنشورة مفيدة وواضحة للباحثين عن العقارات والسيارات." updatedAt="11 أكتوبر 2026" sections={[
    { title: 'دقة المعلومات والوسائط', content: <InfoList items={['قدّم معلومات صحيحة بقدر علمك، ولا تستخدم وصفًا أو صورًا توحي بمواصفات غير موجودة.', 'لا تنشر إلا الصور والمعلومات التي تملك حق استخدامها أو حصلت على إذن مناسب بشأنها.', 'تجنب تكرار الإعلان نفسه أو نشر بيانات اتصال شخصية لأشخاص آخرين دون موافقتهم.', 'لا تضمن في العرض أمورًا لا تستطيع إثباتها أو التحكم بها.']} /> },
    { title: 'تحديث الحالة', content: <p>عند تغير توفر العقار أو السيارة، حدّث حالة الإعلان من أدوات الإدارة المتاحة. إذا لم تستطع الوصول إلى أدوات التعديل، تواصل مع القِرش واذكر رابط العرض أو معرّفه.</p> },
    { title: 'المراجعة والإبلاغ', content: <p>تتيح المنصة إدارة ومراجعة العروض ضمن أدواتها الداخلية. إذا لاحظت معلومات غير صحيحة أو صورة مخالفة أو عرضًا مكررًا، أرسل البلاغ عبر <a className="font-bold text-[var(--brand)] underline" href="/report-issue">صفحة الإبلاغ عن مشكلة</a>. لا ترسل بيانات حساسة لا تلزم لفهم البلاغ.</p> },
    { title: 'إزالة المحتوى', content: <p>قد تتخذ المنصة إجراءً على المحتوى عند الاشتباه في عدم دقته أو مخالفته للقواعد أو حقوق الغير. لا يعني ذلك أن كل عرض تم التحقق منه مستقلًا قبل ظهوره.</p> },
  ]}/>;
}
