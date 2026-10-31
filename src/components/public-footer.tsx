import Image from 'next/image';
import Link from 'next/link';
import { SocialLinks } from '@/components/social-links';
import { LocalizedText } from '@/components/language-provider';

const groups = [
  { title: 'استكشف', links: [['/', 'الرئيسية'], ['/properties', 'العقارات'], ['/properties/sale', 'عقارات للبيع'], ['/properties/rent', 'عقارات للإيجار'], ['/cars', 'السيارات'], ['/cars/sale', 'سيارات للبيع'], ['/cars/rent', 'سيارات للإيجار'], ['/trips', 'رحلات وحجز الباصات']] },
  { title: 'عن القِرش', links: [['/about', 'من نحن'], ['/partners', 'شركاء النجاح'], ['/contact', 'تواصل معنا'], ['/faq', 'الأسئلة الشائعة']] },
  { title: 'السياسات', links: [['/privacy-policy', 'سياسة الخصوصية'], ['/terms', 'الشروط والأحكام'], ['/cookie-policy', 'سياسة ملفات تعريف الارتباط'], ['/listing-policy', 'سياسة نشر العروض'], ['/accessibility', 'إمكانية الوصول']] },
  { title: 'المساعدة', links: [['/report-issue', 'الإبلاغ عن مشكلة'], ['/faq', 'الأسئلة الشائعة'], ['/trips/bookings', 'حجوزات رحلاتي']] },
] as const;

export function PublicFooter() {
  return <footer className="public-footer border-t border-[var(--line)]"><div className="mx-auto grid max-w-6xl gap-9 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_2fr] lg:py-14">
    <div><Link href="/" aria-label="القِرش - الرئيسية"><Image src="/brand/alqirsh-logo.png" alt="القِرش" width={180} height={60} className="h-12 w-auto object-contain" /></Link><p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]"><LocalizedText value="القِرش منصة لاستكشاف العقارات والسيارات للبيع والإيجار، ومواعيد رحلات الباص المنشورة. راجع تفاصيل كل عرض وتواصل عبر الخيارات الموضحة فيه." /></p><p className="mt-3 max-w-sm text-xs leading-6 text-[var(--muted)]"><LocalizedText value="يمكنك استخدام المساعد الذكي الظاهر على الموقع للبحث عن العروض والوصول إلى معلومات الموقع." /></p><h2 className="mb-3 mt-5 text-sm font-black"><LocalizedText value="تابع القِرش" /></h2><SocialLinks variant="compact" /></div>
    <nav aria-label="روابط تذييل الموقع" className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">{groups.map((group) => <section key={group.title}><h2 className="mb-3 text-sm font-black"><LocalizedText value={group.title} /></h2><ul className="grid gap-2.5 text-sm font-medium text-[var(--muted)]">{group.links.map(([href, label]) => <li key={href}><Link href={href} className="inline-flex min-h-7 items-center transition hover:text-[var(--brand)] focus-visible:text-[var(--brand)]"><LocalizedText value={label} /></Link></li>)}</ul></section>)}</nav>
  </div><div className="border-t border-[var(--line)] px-5 py-4 text-center text-xs text-[var(--muted)]">© {new Date().getFullYear()} <LocalizedText value="القِرش" /> — <LocalizedText value="عقارات وسيارات" /></div></footer>;
}
