import Image from 'next/image';
import Link from 'next/link';

const links = [['/sales', 'عقارات للبيع'], ['/rentals', 'عقارات للإيجار'], ['/cars', 'السيارات'], ['/partners', 'شركاء النجاح'], ['/contact', 'تواصل معنا']] as const;

export function PublicFooter() {
  return <footer className="public-footer border-t border-[var(--line)]"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-[1.2fr_1fr] lg:py-14"><div><Image src="/brand/alqirsh-logo.png" alt="القِرش" width={180} height={60} className="h-12 w-auto object-contain" /><p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">منصة القِرش للعقارات والسيارات، لتصفح العروض المتاحة والتواصل بشأنها بثقة ووضوح.</p></div><nav aria-label="روابط تذييل الموقع" className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-semibold">{links.map(([href, label]) => <Link key={href} href={href} className="transition hover:text-[var(--brand)]">{label}</Link>)}</nav></div><div className="border-t border-[var(--line)] px-5 py-4 text-center text-xs text-[var(--muted)]">© {new Date().getFullYear()} القِرش — عقارات وسيارات</div></footer>;
}
