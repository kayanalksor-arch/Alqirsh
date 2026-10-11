import type { Metadata } from 'next';
import { InfoList, PublicInfoPage } from '@/components/public-info-page';

export const metadata: Metadata = { title: 'إمكانية الوصول', description: 'معلومات عن جهود منصة القِرش لتحسين سهولة استخدام الموقع والوصول إلى محتواه.', alternates: { canonical: '/accessibility' }, openGraph: { type: 'article', title: 'إمكانية الوصول | القِرش' } };

export default function AccessibilityPage() {
  return <PublicInfoPage eyebrow="معلومات المنصة" title="إمكانية الوصول" intro="نعمل على جعل صفحات القِرش أوضح وأسهل استخدامًا عبر الشاشات المختلفة، مع دعم اللغة العربية واتجاه الكتابة من اليمين إلى اليسار." sections={[
    { title: 'ما نعمل على تحسينه', content: <InfoList items={['استخدام عناوين وأقسام واضحة لتسهيل تصفح المحتوى.', 'إتاحة مؤشرات تركيز مرئية للتنقل بلوحة المفاتيح في العناصر التفاعلية.', 'توفير تسميات واضحة لحقول النماذج ونصوص بديلة للصور ذات المعنى.', 'مراعاة التباين والألوان في الوضعين الفاتح والداكن، والتصميم المتجاوب.']} /> },
    { title: 'إبلاغنا عن عائق', content: <p>إذا واجهت صعوبة في قراءة المحتوى أو استخدام وظيفة، يرجى إبلاغنا عبر صفحة <a className="font-bold text-[var(--brand)] underline" href="/report-issue">الإبلاغ عن مشكلة</a> مع ذكر الصفحة ونوع الجهاز أو المتصفح إن أمكن. لا ندّعي في الوقت الحالي اكتمال تدقيق امتثال لمعيار وصول محدد.</p> },
  ]}/>;
}
