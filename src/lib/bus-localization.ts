export type BusLocale = 'ar' | 'en';
type BusValueKind = 'booking' | 'payment' | 'paymentMethod' | 'trip' | 'bus' | 'ticket' | 'receipt' | 'seat' | 'scan';

const values: Record<BusValueKind, Record<string, [string, string]>> = {
  booking: {
    pending: ['بانتظار التأكيد', 'Awaiting confirmation'],
    confirmed: ['مؤكد', 'Confirmed'],
    cancelled: ['ملغي', 'Cancelled'],
    completed: ['مكتمل', 'Completed'],
  },
  payment: {
    awaiting_receipt: ['بانتظار إيصال الدفع', 'Awaiting payment receipt'],
    receipt_submitted: ['تم إرسال الإيصال', 'Receipt submitted'],
    under_review: ['قيد مراجعة الدفع', 'Payment under review'],
    paid: ['مدفوع', 'Paid'],
    cash_due: ['مستحق عند الصعود', 'Due when boarding'],
    partially_refunded: ['مسترد جزئيًا', 'Partially refunded'],
    refunded: ['مسترد', 'Refunded'],
    rejected: ['مرفوض', 'Rejected'],
  },
  paymentMethod: {
    bank_transfer: ['تحويل بنكي أو محفظة إلكترونية', 'Bank or wallet transfer'],
    cash_on_boarding: ['نقدًا عند الصعود', 'Cash on boarding'],
  },
  trip: {
    draft: ['مسودة', 'Draft'],
    published: ['منشورة', 'Published'],
    cancelled: ['ملغاة', 'Cancelled'],
    completed: ['مكتملة', 'Completed'],
  },
  bus: {
    active: ['نشط', 'Active'],
    maintenance: ['قيد الصيانة', 'Under maintenance'],
    stopped: ['متوقف', 'Stopped'],
    inactive: ['غير نشط', 'Inactive'],
    regular: ['عادي', 'Regular'],
    standard: ['عادي', 'Standard'],
    ordinary: ['عادي', 'Ordinary'],
    vip: ['فاخر', 'VIP'],
    tourist: ['سياحي', 'Tourist'],
    minibus: ['حافلة صغيرة', 'Minibus'],
  },
  ticket: {
    valid: ['صالحة', 'Valid'],
    cancelled: ['ملغاة', 'Cancelled'],
    refunded: ['مستردة', 'Refunded'],
    boarded: ['تم تسجيل الصعود', 'Boarded'],
  },
  receipt: {
    pending: ['بانتظار المراجعة', 'Awaiting review'],
    accepted: ['مقبول', 'Accepted'],
    rejected: ['مرفوض', 'Rejected'],
    replacement_requested: ['مطلوب إيصال بديل', 'Replacement requested'],
    'image/jpeg': ['صورة JPEG', 'JPEG image'],
    'image/png': ['صورة PNG', 'PNG image'],
    'image/webp': ['صورة WEBP', 'WEBP image'],
    'application/pdf': ['مستند PDF', 'PDF document'],
  },
  seat: {
    standard: ['عادي', 'Standard'],
    accessible: ['مخصص لذوي الإعاقة', 'Accessible'],
    premium: ['مميز', 'Premium'],
    unavailable: ['غير متاح', 'Unavailable'],
  },
  scan: {
    valid: ['مقبولة', 'Accepted'],
    already_boarded: ['مستخدمة مسبقًا', 'Already used'],
    payment_due: ['الدفع غير مستوفى', 'Payment due'],
    invalid: ['غير صحيحة', 'Invalid'],
    wrong_trip: ['لرحلة أخرى', 'For another trip'],
    cancelled: ['ملغاة', 'Cancelled'],
    refunded: ['مستردة', 'Refunded'],
    unapproved: ['غير معتمد', 'Unapproved'],
    offline: ['تعذر التحقق', 'Could not verify'],
  },
};

export function localizeBusValue(kind: BusValueKind, value: string | null | undefined, locale: BusLocale) {
  if (!value) return locale === 'ar' ? 'غير محدد' : 'Not specified';
  const normalized = value.trim().toLowerCase();
  const translation = values[kind][normalized];
  if (translation) return translation[locale === 'ar' ? 0 : 1];
  if (locale === 'ar') return /[\u0600-\u06ff]/u.test(value) ? value : 'غير محدد';
  return /[\u0600-\u06ff]/u.test(value) ? 'Other' : value;
}

export function localizeBusError(message: string, locale: BusLocale) {
  const key = message.trim().toLowerCase();
  const errors: Record<string, [string, string]> = {
    'choose an active bus.': ['اختر حافلة نشطة.', 'Choose an active bus.'],
    'the bus needs at least one available seat.': ['يجب أن تحتوي الحافلة على مقعد متاح واحد على الأقل.', 'The bus needs at least one available seat.'],
    'departure must be in the future.': ['يجب أن يكون موعد المغادرة في المستقبل.', 'Departure must be in the future.'],
    'arrival must be after departure.': ['يجب أن يكون الوصول بعد موعد المغادرة.', 'Arrival must be after departure.'],
    'enter a valid ticket price.': ['أدخل سعرًا صحيحًا للتذكرة.', 'Enter a valid ticket price.'],
    'bus not found.': ['لم يتم العثور على الحافلة.', 'Bus not found.'],
    'only jpg, png, and webp images are allowed.': ['ارفع صورة بصيغة JPG أو PNG أو WEBP فقط.', 'Only JPG, PNG, and WEBP images are allowed.'],
    'photo must be a valid image up to 12 mb.': ['يجب أن تكون الصورة صالحة وألا يتجاوز حجمها 12 ميجابايت.', 'Photo must be a valid image up to 12 MB.'],
    'compressed photo exceeds 5 mb. choose a smaller image.': ['حجم الصورة بعد الضغط أكبر من 5 ميجابايت. اختر صورة أصغر.', 'Compressed photo exceeds 5 MB. Choose a smaller image.'],
    'could not update bus photo.': ['تعذر تحديث صورة الحافلة.', 'Could not update bus photo.'],
    'could not save the bus.': ['تعذر حفظ الحافلة.', 'Could not save the bus.'],
  };
  const match = errors[key];
  if (match) return match[locale === 'ar' ? 0 : 1];
  if (locale === 'ar') return 'تعذر إتمام العملية. تحقق من البيانات وحاول مرة أخرى.';
  return 'The operation could not be completed. Check the information and try again.';
}

export function formatBusCurrency(amount: number | string, locale: BusLocale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency', currency: 'EGP', maximumFractionDigits: 2,
  }).format(Number(amount));
}
