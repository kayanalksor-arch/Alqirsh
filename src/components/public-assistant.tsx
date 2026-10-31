'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Bot, Building2, CarFront, LoaderCircle, MapPin, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';

type Locale = 'ar' | 'en';
type Localized = { ar: string; en: string };
type Result = {
  kind: 'property' | 'car'; id: string; title: string; image: string | null; href: string;
  price: number | null; priceUnit: 'day' | 'week' | 'month' | null; location: string | null;
  propertyType?: string | null; area?: number | null; bedrooms?: number | null; bathrooms?: number | null; year?: number | null;
  mileage?: number | null; transmission?: string | null; fuelType?: string | null; color?: string | null;
};
type Suggestion = { label: Localized; action: string };
type Message = { id: number; role: 'assistant' | 'user'; text: Localized | string; suggestions?: Suggestion[]; results?: Result[] };

const localized = (ar: string, en: string): Localized => ({ ar, en });
const greeting = (): Localized => localized('أهلًا بك في القرش! 👋\nأستطيع مساعدتك في البحث عن العقارات والسيارات، واستعراض رحلات الباص المنشورة، والوصول إلى معلومات الموقع وخيارات التواصل.', 'Welcome to Alqirsh! 👋\nI can help you search property and car listings, browse published bus trips, find information on the site, and reach the contact options.');

function mainOptions(): Suggestion[] {
  const options: Array<[string, string, string]> = [
    ['property', '🏠 أبحث عن عقار', '🏠 Find a property'],
    ['car', '🚗 أبحث عن سيارة', '🚗 Find a car'],
    ['bus', '🚌 رحلات الباص والحجز', '🚌 Bus trips and booking'],
    ['installments', '💰 التقسيط وطرق الدفع', '💰 Installments and payment'],
    ['investment', '📈 الفرص الاستثمارية', '📈 Investment listings'],
    ['management', '🏢 إدارة الأملاك', '🏢 Property management'],
    ['finishing', '🛠️ التشطيبات والمقاولات', '🛠️ Finishing and contracting'],
    ['partnership', '🤝 الشراكات والتعاون', '🤝 Partnerships'],
    ['about', 'ℹ️ معلومات عن القرش', 'ℹ️ About Alqirsh'],
    ['contact', '📞 التواصل مع الفريق', '📞 Contact the team'],
    ['faq', '❓ الأسئلة الشائعة', '❓ Frequently asked questions'],
  ];
  return options.map(([action, ar, en]) => ({ action, label: localized(ar, en) }));
}

const message = (id: number, text: Localized, suggestions?: Suggestion[], results?: Result[]): Message => ({ id, role: 'assistant', text, suggestions, results });

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/gu, '').replace(/[أإآ]/gu, 'ا').replace(/ى/gu, 'ي');
}

function classifyIntent(value: string): 'property' | 'car' | 'bus' | 'installments' | 'contact' | 'management' | 'finishing' | 'partnership' | 'investment' | 'faq' | 'about' | 'add-listing' | null {
  const query = normalizeQuery(value);
  if (/باص|باصات|رحلة|رحلات|تذكرة|تذاكر|bus trips?|coach|ticket|boarding/u.test(query)) return 'bus';
  if (/سيار|عربيات|cars?\b|vehicles?\b|تويوتا|هيونداي|كيا\b|مرسيدس/u.test(query)) {
    return /اضيف|اضافه|انشر|نشر|اعرض|اعلان|listing|publish/u.test(query) ? 'add-listing' : 'car';
  }
  if (/عقار|عقارات|شقه|شقق|فيلا|ارض|اراض|مكتب|محل|properties?\b|apartment|villa|house|land|flat/u.test(query)) {
    return /اضيف|اضافه|انشر|نشر|اعرض|اعلان|listing|publish/u.test(query) ? 'add-listing' : 'property';
  }
  if (/تقسيط|قسط|تمويل|دفع|installment|finance|payment/u.test(query)) return 'installments';
  if (/اتصل|تواصل|رقم الهاتف|هاتف|phone|call|contact|whatsapp|واتساب/u.test(query)) return 'contact';
  if (/اداره الاملاك|ادارة الاملاك|اداره العقار|property management/u.test(query)) return 'management';
  if (/تشطيب|مقاول|مقاولات|finishing|contract|خدمه|خدمة/u.test(query)) return 'finishing';
  if (/شراك|تعاون|partner|collaborat/u.test(query)) return 'partnership';
  if (/استثمار|استثماري|investment|invest/u.test(query)) return 'investment';
  if (/سؤال|اسئله|اسئلة|faq|مساعده|help/u.test(query)) return 'faq';
  if (/من نحن|عن القرش|عن الق|الشركه|الشركة|الخدمات|about|company|services/u.test(query)) return 'about';
  return null;
}

function formatMoney(value: number | null, locale: Locale) {
  if (value == null || !Number.isFinite(value)) return locale === 'en' ? 'Price not provided' : 'السعر غير منشور';
  return new Intl.NumberFormat(locale === 'en' ? 'en-EG' : 'ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value);
}

function infoResponse(action: string): Message {
  const contact = [{ action: 'contact', label: localized('اتصل بالفريق', 'Contact the team') }, { action: 'home', label: localized('القائمة الرئيسية', 'Main menu') }];
  switch (action) {
    case 'bus':
      return message(Date.now(), localized('تعرض صفحة الرحلات مواعيد الباصات المنشورة وتفاصيل المقاعد والأسعار وخطوات الحجز المتاحة لكل رحلة. افتح الصفحة لمراجعة الرحلات الحالية.', 'The Trips page shows published bus schedules, seat and price details, and available booking steps. Open it to review current trips.'), [{ action: 'open-trips', label: localized('فتح رحلات الباص', 'Open bus trips') }, ...contact]);
    case 'installments':
      return message(Date.now(), localized('لا تنشر صفحات الموقع نسب فوائد أو مقدمات أو مدد تقسيط موحدة. قد تختلف الشروط بحسب العرض، لذا تحقق من تفاصيله المنشورة أو استفسر من الفريق قبل اتخاذ قرار.', 'The site does not publish standard interest rates, down payments, or installment terms. Terms may vary by listing, so check its published details or ask the team before making a decision.'), [...contact, { action: 'faq', label: localized('الأسئلة الشائعة', 'FAQ') }]);
    case 'management':
      return message(Date.now(), localized('يذكر الموقع وجود قسم لإدارة الأملاك ضمن أدوات المنصة، لكنه لا ينشر تفاصيل عامة كافية عن نطاق الخدمة أو شروطها. تواصل مع الفريق للتحقق من الخدمة المناسبة.', 'The site mentions a property management section among its platform tools, but does not publish enough public detail about service scope or terms. Contact the team to confirm what is available.'), [...contact, { action: 'about', label: localized('عن القرش', 'About Alqirsh') }]);
    case 'finishing':
      return message(Date.now(), localized('لم أجد تفاصيل منشورة عن التشطيبات أو المقاولات في صفحات الموقع المتاحة. يمكنك وصف احتياجك للفريق عبر صفحة التواصل للتحقق من الخيارات.', 'I could not find published details about finishing or contracting services on the available site pages. Describe what you need through the contact page so the team can confirm available options.'), contact);
    case 'partnership':
      return message(Date.now(), localized('يمكنك استكشاف الشركاء المنشورين في صفحة الشركاء. للاستفسار عن التعاون، تواصل مع الفريق مباشرة.', 'You can explore published partners on the Partners page. For collaboration enquiries, contact the team directly.'), [{ action: 'open-partners', label: localized('عرض الشركاء', 'View partners') }, ...contact]);
    case 'investment':
      return message(Date.now(), localized('يمكنني عرض العقارات المنشورة للبيع لاستكشاف الخيارات. لا تضمن المنصة عوائد استثمارية، وتحتاج التفاصيل المالية الخاصة بكل عرض إلى تأكيد من المعلن.', 'I can show published properties for sale. The site does not guarantee investment returns, and financial details for each listing should be confirmed with its advertiser.'), [{ action: 'property-sale', label: localized('استعراض عقارات للبيع', 'Browse properties for sale') }, ...contact]);
    case 'about':
      return message(Date.now(), localized('القرش منصة رقمية تعرض العقارات والسيارات للبيع أو الإيجار، وتنشر مواعيد رحلات الباص وخطوات حجز المقاعد المتاحة. يمكنك قراءة نبذة المنصة أو استكشاف الأقسام.', 'Alqirsh is a digital platform for property and car listings for sale or rent, as well as published bus schedules and available seat booking steps. Read more about the platform or explore its sections.'), [{ action: 'open-about', label: localized('عن القرش', 'About Alqirsh') }, { action: 'property', label: localized('العقارات', 'Properties') }, { action: 'car', label: localized('السيارات', 'Cars') }, { action: 'open-trips', label: localized('رحلات الباص', 'Bus trips') }]);
    case 'faq':
      return message(Date.now(), localized('تجد الإجابات المنشورة عن البحث والتواصل واستخدام الموقع في صفحة الأسئلة الشائعة.', 'Published answers about searching, contacting advertisers, and using the site are available on the FAQ page.'), [{ action: 'open-faq', label: localized('فتح الأسئلة الشائعة', 'Open FAQ') }, ...contact]);
    case 'add-listing':
      return message(Date.now(), localized('تخضع إضافة العروض لصلاحية الحساب والأدوات المتاحة. سجّل الدخول إذا كان لديك حساب مخوّل، أو تواصل مع الفريق للاستفسار عن آلية النشر.', 'Listing creation depends on account permissions and available tools. Sign in if you have an authorized account, or contact the team to ask about publishing.'), [{ action: 'open-login', label: localized('تسجيل الدخول', 'Sign in') }, ...contact]);
    case 'service-request':
      return message(Date.now(), localized('لم أجد نموذجًا عامًا لطلب هذه الخدمة. يمكنك إرسال استفسار عبر صفحة التواصل، ولن أرسل أي طلب نيابةً عنك.', 'I could not find a public service request form. You can send an enquiry through the contact page; I will not submit anything on your behalf.'), [{ action: 'open-contact', label: localized('صفحة التواصل', 'Contact page') }, ...contact]);
    case 'contact':
      return message(Date.now(), localized('يمكنك الاتصال بفريق القرش على الرقم 01090886364 أو فتح صفحة التواصل للمزيد من الخيارات.', 'Call the Alqirsh team at 01090886364 or open the Contact page for more options.'), [{ action: 'open-contact', label: localized('صفحة التواصل', 'Contact page') }, ...contact]);
    default:
      return message(Date.now(), localized('أهلًا بك في القرش.', 'Welcome to Alqirsh.'), mainOptions());
  }
}

export function PublicAssistant() {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const currentLocale: Locale = locale === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [message(1, greeting(), mainOptions())]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, pending, open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const addUser = (text: string) => setMessages((items) => [...items, { id: nextId.current++, role: 'user', text }]);
  const addAssistant = (text: Localized, suggestions?: Suggestion[], results?: Result[]) => setMessages((items) => [...items, message(nextId.current++, text, suggestions, results)]);

  const performSearch = async (kind: 'property' | 'car', query: string, view: 'all' | 'sale' | 'rent' = 'all', visibleQuery?: string) => {
    if (pending) return;
    if (visibleQuery) addUser(visibleQuery);
    setPending(true);
    try {
      const response = await fetch('/api/assistant/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, kind, view, locale: currentLocale }),
      });
      const payload = await response.json() as { results?: Result[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'search_failed');
      const results = Array.isArray(payload.results) ? payload.results : [];
      const isProperty = kind === 'property';
      const suggestions = isProperty
        ? [{ action: 'property-all', label: localized('عرض كل العقارات', 'Show all properties') }, { action: 'installments', label: localized('السؤال عن التقسيط', 'Ask about installments') }, { action: 'contact', label: localized('التواصل مع الفريق', 'Contact the team') }]
        : [{ action: 'car-all', label: localized('عرض كل السيارات', 'Show all cars') }, { action: 'installments', label: localized('السؤال عن التقسيط', 'Ask about installments') }, { action: 'contact', label: localized('التواصل مع الفريق', 'Contact the team') }];
      const resultText = results.length
        ? (currentLocale === 'en'
          ? localized('', `I found ${results.length} matching listing${results.length === 1 ? '' : 's'} in the public catalogue.`)
          : localized(`وجدت ${results.length} نتيجة في العروض العامة.`, ''))
        : (currentLocale === 'en'
          ? localized('', 'I could not find public listings matching those filters. Try broadening the location or budget, or changing the listing type.')
          : localized('لم أجد عروضًا عامة تطابق البحث الحالي. جرّب توسيع المنطقة أو الميزانية أو تغيير نوع العرض.', ''));
      addAssistant(resultText, suggestions, results);
    } catch {
      addAssistant(localized('تعذر تحميل العروض الآن. لم تُحذف المحادثة؛ أعد المحاولة أو افتح القوائم مباشرة.', 'Listings could not be loaded right now. Your conversation is still here; retry or open the listings directly.'), [
        { action: kind === 'property' ? 'property-all' : 'car-all', label: localized('إعادة المحاولة', 'Retry search') },
        { action: 'contact', label: localized('التواصل مع الفريق', 'Contact the team') },
      ]);
    } finally { setPending(false); }
  };

  const beginFlow = (kind: 'property' | 'car') => {
    if (kind === 'property') addAssistant(localized('ما الغرض من البحث؟ يمكنك تحديد نوع العرض الآن أو كتابة المنطقة والميزانية مباشرة.', 'What are you looking for? Choose a listing type or type a location and budget.'), [
      { action: 'property-sale', label: localized('شراء', 'For sale') }, { action: 'property-rent', label: localized('إيجار', 'For rent') },
      { action: 'property-all', label: localized('كل العقارات', 'All properties') }, { action: 'property-invest', label: localized('استثمار', 'Investment') },
    ]);
    else addAssistant(localized('هل تبحث عن سيارة للبيع أم للإيجار؟ يمكنك أيضًا كتابة الماركة أو الموديل أو الميزانية.', 'Are you looking for a car to buy or rent? You can also type a make, model, or budget.'), [
      { action: 'car-sale', label: localized('شراء', 'For sale') }, { action: 'car-rent', label: localized('إيجار', 'For rent') }, { action: 'car-all', label: localized('كل السيارات', 'All cars') },
    ]);
  };

  const processText = async (text: string) => {
    const intent = classifyIntent(text);
    if (intent === 'property') {
      if (/تقسيط|قسط|تمويل|installment|finance/u.test(normalizeQuery(text))) {
        addUser(text);
        const details = infoResponse('installments');
        addAssistant(details.text as Localized, details.suggestions);
        await performSearch('property', text);
      } else await performSearch('property', text, 'all', text);
    } else if (intent === 'car') {
      if (/تقسيط|قسط|تمويل|installment|finance/u.test(normalizeQuery(text))) {
        addUser(text);
        const details = infoResponse('installments');
        addAssistant(details.text as Localized, details.suggestions);
        await performSearch('car', text);
      } else await performSearch('car', text, 'all', text);
    } else if (intent) {
      addUser(text);
      const response = infoResponse(intent);
      addAssistant(response.text as Localized, response.suggestions);
    } else {
      addUser(text);
      const answer = localized('أستطيع البحث في قوائم العقارات والسيارات العامة، وإرشادك إلى رحلات الباص المنشورة والإجابة عن معلومات الموقع المتاحة. هل تبحث عن عقار أو سيارة أو رحلة؟', 'I can search public property and car listings, guide you to published bus trips, and answer questions using available site information. Are you looking for a property, a car, or a trip?');
      addAssistant(answer, mainOptions());
    }
  };

  const handleAction = async (action: string) => {
    if (pending) return;
    if (action === 'home') { addAssistant(greeting(), mainOptions()); return; }
    if (action === 'property' || action === 'car') { beginFlow(action); return; }
    if (action === 'installments' && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.text === infoResponse('installments').text) {
      const targetKind = messages.slice(0, -1).findLast((item) => item.role === 'user' && typeof item.text === 'string' && /عقار|عقارات|شقه|سياره|cars?|property|apartment/iu.test(normalizeQuery(item.text)))?.text;
      await performSearch(/سياره|cars?/iu.test(normalizeQuery(typeof targetKind === 'string' ? targetKind : '')) ? 'car' : 'property', typeof targetKind === 'string' ? targetKind : '', 'all', undefined);
      return;
    }
    if (action.startsWith('property-')) {
      if (action === 'property-invest') {
        addAssistant(localized('سأعرض العقارات المنشورة للبيع. لا تضمن المنصة عائدًا استثماريًا؛ تحقق من المعلومات المالية مع المعلن.', 'I will show published properties for sale. The site does not guarantee returns; confirm financial information with the advertiser.'));
        await performSearch('property', 'استثمار', 'sale', currentLocale === 'en' ? 'Browse property listings for sale' : 'استعراض عقارات للبيع');
      } else {
        const view = action === 'property-sale' ? 'sale' : action === 'property-rent' ? 'rent' : 'all';
        await performSearch('property', '', view, currentLocale === 'en' ? view === 'sale' ? 'Properties for sale' : view === 'rent' ? 'Properties for rent' : 'All properties' : view === 'sale' ? 'عقارات للبيع' : view === 'rent' ? 'عقارات للإيجار' : 'كل العقارات');
      }
      return;
    }
    if (action.startsWith('car-')) {
      const view = action === 'car-sale' ? 'sale' : action === 'car-rent' ? 'rent' : 'all';
      await performSearch('car', '', view, currentLocale === 'en' ? view === 'sale' ? 'Cars for sale' : view === 'rent' ? 'Cars for rent' : 'All cars' : view === 'sale' ? 'سيارات للبيع' : view === 'rent' ? 'سيارات للإيجار' : 'كل السيارات');
      return;
    }
    const target = action === 'open-contact' ? '/contact' : action === 'open-faq' ? '/faq' : action === 'open-about' ? '/about' : action === 'open-partners' ? '/partners' : action === 'open-trips' ? '/trips' : null;
    const destination = action === 'open-login' ? '/login' : target;
    if (destination) { window.location.assign(destination); return; }
    const response = infoResponse(action);
    addAssistant(response.text as Localized, response.suggestions);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || pending) return;
    setInput('');
    await processText(value);
  };
  const inputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
  };
  const startNew = () => { if (!pending) { nextId.current = 2; setInput(''); setMessages([message(1, greeting(), mainOptions())]); } };

  if (pathname === '/login' || pathname.startsWith('/dashboard')) return null;

  return <div dir={currentLocale === 'ar' ? 'rtl' : 'ltr'}>
    <button type="button" aria-label={currentLocale === 'en' ? 'Open Alqirsh assistant' : 'افتح مساعد القرش'} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="fixed bottom-5 end-5 z-50 grid size-14 place-items-center rounded-full bg-[var(--brand)] text-white shadow-xl shadow-emerald-950/20 transition hover:scale-105 hover:bg-[var(--brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)] motion-reduce:transition-none sm:bottom-6 sm:end-6 sm:size-16">
      {open ? <X size={25} aria-hidden="true" /> : <MessageCircle size={27} aria-hidden="true" />}
    </button>

    <section role="dialog" aria-modal="false" aria-label={currentLocale === 'en' ? 'Alqirsh assistant' : 'مساعد القرش'} aria-hidden={!open} inert={!open} className={`fixed bottom-[5.5rem] end-4 z-50 flex h-[min(42rem,calc(100dvh-7rem))] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] shadow-2xl shadow-black/20 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none sm:bottom-24 sm:end-6 ${open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-[0.97] opacity-0'}`}>
      <header className="flex shrink-0 items-center gap-3 bg-[var(--brand)] px-4 py-3.5 text-white">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15"><Sparkles size={21} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-black">{currentLocale === 'en' ? 'Alqirsh Assistant' : 'مساعد القرش'}</h2><p className="mt-0.5 text-[11px] text-white/80">{currentLocale === 'en' ? 'Public listing search · Site information' : 'بحث في العروض العامة · معلومات الموقع'}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label={currentLocale === 'en' ? 'Close assistant' : 'إغلاق المساعد'} className="grid size-9 place-items-center rounded-lg text-white/90 transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none"><X size={19} aria-hidden="true" /></button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-4" aria-live="polite">
          {messages.map((item) => <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[94%] min-w-0 ${item.role === 'user' ? 'rounded-2xl rounded-ee-md bg-[var(--brand)] px-3.5 py-2.5 text-white' : 'w-full'}`}>
            {item.role === 'assistant' && <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--canvas)] text-[var(--brand)]"><Bot size={16} aria-hidden="true" /></span>
              <p dir={currentLocale === 'ar' ? 'rtl' : 'ltr'} className="whitespace-pre-line rounded-2xl rounded-ss-md bg-[var(--canvas)] px-3.5 py-2.5 text-sm leading-6 text-[var(--ink)]">{typeof item.text === 'string' ? item.text : item.text[currentLocale]}</p>
            </div>}
            {item.role === 'user' && <p dir="auto" className="whitespace-pre-wrap text-sm leading-6">{item.text as string}</p>}
            {item.role === 'assistant' && item.results && item.results.length > 0 && <div className="mt-3 grid gap-2.5 ps-9">
              {item.results.map((result) => <article key={`${result.kind}-${result.id}`} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]" translate="no">
                <div className="flex gap-3 p-2.5">
                  {result.image ? <Image src={result.image} alt="" width={88} height={72} unoptimized className="h-[4.5rem] w-[5.5rem] shrink-0 rounded-lg object-cover" /> : <span className="grid h-[4.5rem] w-[5.5rem] shrink-0 place-items-center rounded-lg bg-[var(--canvas)] text-[var(--brand)]">{result.kind === 'property' ? <Building2 size={22} /> : <CarFront size={22} />}</span>}
                  <div className="min-w-0 flex-1"><p dir="auto" className="line-clamp-2 text-sm font-bold text-[var(--ink)]">{result.title}</p><p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-[var(--muted)]"><MapPin size={12} aria-hidden="true" />{result.location || (currentLocale === 'en' ? 'Location not provided' : 'الموقع غير منشور')}</p><p dir="auto" className="mt-1 text-sm font-black text-[var(--brand)]">{formatMoney(result.price, currentLocale)}{result.priceUnit ? ` / ${currentLocale === 'en' ? result.priceUnit : result.priceUnit === 'month' ? 'شهر' : result.priceUnit === 'week' ? 'أسبوع' : 'يوم'}` : ''}</p></div>
                </div>
                {(result.propertyType || result.area != null || result.bedrooms != null || result.bathrooms != null || result.year != null || result.mileage != null || result.transmission || result.fuelType || result.color) && <p className="px-3 pb-2 text-xs text-[var(--muted)]">{result.kind === 'property'
                  ? [result.propertyType, result.area != null ? `${currentLocale === 'en' ? 'Area' : 'المساحة'}: ${result.area} ${currentLocale === 'en' ? 'm²' : 'م²'}` : null, result.bedrooms != null ? `${currentLocale === 'en' ? 'Bedrooms' : 'غرف النوم'}: ${result.bedrooms}` : null, result.bathrooms != null ? `${currentLocale === 'en' ? 'Bathrooms' : 'الحمامات'}: ${result.bathrooms}` : null].filter(Boolean).join(' · ')
                  : [result.year, result.mileage != null ? `${new Intl.NumberFormat(currentLocale === 'en' ? 'en-EG' : 'ar-EG').format(result.mileage)} ${currentLocale === 'en' ? 'km' : 'كم'}` : null, result.transmission, result.fuelType, result.color].filter(Boolean).join(' · ')}</p>}
                <div className="grid grid-cols-2 border-t border-[var(--line)]">
                  <Link href={result.href} className="inline-flex min-h-10 items-center justify-center gap-1.5 px-2 text-xs font-bold text-[var(--brand)] transition hover:bg-[var(--canvas)] motion-reduce:transition-none">{currentLocale === 'en' ? 'View details' : 'عرض التفاصيل'} {currentLocale === 'en' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}</Link>
                  <a href="tel:01090886364" className="inline-flex min-h-10 items-center justify-center gap-1.5 border-s border-[var(--line)] px-2 text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--canvas)] motion-reduce:transition-none">{currentLocale === 'en' ? 'Call Now' : 'اتصل الآن'}</a>
                </div>
              </article>)}
            </div>}
            {item.role === 'assistant' && item.suggestions && <div className="mt-2.5 flex flex-wrap gap-2 ps-9">
              {item.suggestions.filter((option) => Boolean(option.label[currentLocale])).map((option, index) => <button key={`${item.id}-${option.action}-${index}`} type="button" disabled={pending} onClick={() => void handleAction(option.action)} className="min-h-9 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-start text-xs font-bold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--focus)] motion-reduce:transition-none">{option.label[currentLocale]}</button>)}
            </div>}
          </div>
        </div>)}
        {pending && <div className="flex items-center gap-2 ps-9 text-xs text-[var(--muted)]"><LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{currentLocale === 'en' ? 'Searching public listings…' : 'أبحث في العروض العامة…'}</div>}
      </div>

      <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] sm:px-4">
        <form onSubmit={(event) => void submit(event)} className="flex items-end gap-2">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={inputKeyDown} rows={1} maxLength={400} aria-label={currentLocale === 'en' ? 'Type your question' : 'اكتب سؤالك'} placeholder={currentLocale === 'en' ? 'Ask about a listing or the site…' : 'اسأل عن عرض أو عن الموقع…'} disabled={pending} className="max-h-24 min-h-11 flex-1 resize-y rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3 py-2.5 text-sm leading-5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)] disabled:opacity-60" />
          <button type="submit" disabled={pending || !input.trim()} aria-label={currentLocale === 'en' ? 'Send message' : 'إرسال الرسالة'} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand)] text-white transition hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] motion-reduce:transition-none">{pending ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /> : <Send size={18} className={currentLocale === 'en' ? '' : 'rotate-180'} />}</button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" disabled={pending} onClick={() => addAssistant(greeting(), mainOptions())} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-[var(--muted)] transition hover:bg-[var(--canvas)] hover:text-[var(--ink)] disabled:opacity-50 motion-reduce:transition-none">{currentLocale === 'en' ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}{currentLocale === 'en' ? 'Main options' : 'الخيارات الرئيسية'}</button>
          <button type="button" disabled={pending} onClick={startNew} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold text-[var(--muted)] transition hover:bg-[var(--canvas)] hover:text-[var(--ink)] disabled:opacity-50 motion-reduce:transition-none"><RotateCcw size={13} aria-hidden="true" />{currentLocale === 'en' ? 'New conversation' : 'محادثة جديدة'}</button>
        </div>
      </div>
    </section>
  </div>;
}
