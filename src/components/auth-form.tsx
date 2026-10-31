'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/components/language-provider';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

export function AuthForm({ mode, notice }: { mode: Mode; notice?: string }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const en = locale === 'en';
  const t = (ar: string, english: string) => en ? english : ar;
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordStrength = password.length < 8 ? 0 : password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) ? 3 : /[A-Za-z]/.test(password) && /\d/.test(password) ? 2 : 1;
  const redirectAfterAuth = () => {
    const requested = new URLSearchParams(window.location.search).get('next');
    const next = requested?.startsWith('/dashboard') && !requested.startsWith('//') ? requested : '/trips/bookings';
    router.replace(`/auth/continue?next=${encodeURIComponent(next)}`);
    router.refresh();
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setSuccess(''); setBusy(true);
    try {
      const auth = createClient().auth;
      if (mode === 'login') {
        const { error: authError } = await auth.signInWithPassword({ email: email.trim(), password });
        if (authError) {
          if (authError.code === 'user_banned' || /banned|disabled|inactive/i.test(authError.message)) throw new Error('inactive');
          if (authError.code === 'email_not_confirmed') throw new Error('email_unverified');
          throw new Error('credentials');
        }
        redirectAfterAuth();
      } else if (mode === 'signup') {
        if (password.length < 8 || passwordStrength < 2) throw new Error('weak_password');
        if (password !== confirmPassword) throw new Error('password_mismatch');
        if (!acceptedTerms) throw new Error('terms');
        const { data, error: authError } = await auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Ftrips%2Fbookings`,
            data: { full_name: fullName.trim(), phone: phone.trim() || null },
          },
        });
        if (authError) {
          if (authError.code === 'user_already_exists' || authError.message.toLowerCase().includes('already registered')) throw new Error('exists');
          if (authError.code === 'weak_password') throw new Error('weak_password');
          throw new Error('signup');
        }
        if (data.session) redirectAfterAuth();
        else setSuccess(t('تم إنشاء الحساب. افحص بريدك الإلكتروني واضغط رابط التحقق لتفعيل الحساب.','Account created. Check your email and follow the verification link to activate it.'));
      } else if (mode === 'forgot') {
        const { error: authError } = await auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=%2Fauth%2Fupdate-password` });
        if (authError) throw new Error('reset');
        setSuccess(t('إذا كان البريد مسجلًا، فستصلك رسالة لاستعادة كلمة المرور.','If the email is registered, a password reset message will arrive shortly.'));
      } else {
        if (password.length < 8 || password !== confirmPassword) throw new Error(password.length < 8 ? 'weak_password' : 'password_mismatch');
        const { error: authError } = await auth.updateUser({ password });
        if (authError) throw new Error('reset');
        setSuccess(t('تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.','Password updated. You can sign in now.'));
        window.setTimeout(() => router.replace('/login'), 900);
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : 'unknown';
      const messages: Record<string, [string, string]> = {
        inactive: ['\u0627\u0644\u062d\u0633\u0627\u0628 \u0645\u0648\u0642\u0648\u0641 \u0623\u0648 \u063a\u064a\u0631 \u0646\u0634\u0637. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629.','This account is inactive. Contact the platform administrator.'],
        email_unverified: ['\u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0642\u0628\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644.','Please verify your email before signing in.'],
        credentials: ['البريد الإلكتروني أو كلمة المرور غير صحيحة.','Email or password is incorrect.'],
        exists: ['هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول أو استعد كلمة المرور.','This email is already registered. Sign in or reset your password.'],
        weak_password: ['استخدم كلمة مرور من 8 أحرف على الأقل، تتضمن أحرفًا وأرقامًا.','Use at least 8 characters with both letters and numbers.'],
        password_mismatch: ['كلمتا المرور غير متطابقتين.','Passwords do not match.'],
        terms: ['يرجى الموافقة على الشروط وسياسة الخصوصية.','Please accept the Terms and Privacy Policy.'],
        signup: ['تعذر إنشاء الحساب. تحقق من البريد وحاول مرة أخرى.','Could not create the account. Check the email and try again.'],
        reset: ['تعذر إكمال الطلب. قد تكون الجلسة منتهية؛ ابدأ من جديد.','Could not complete the request. Your session may have expired; start again.'],
      };
      const pair = messages[code] ?? ['حدث خطأ. تحقق من اتصالك وحاول مرة أخرى.','Something went wrong. Check your connection and try again.'];
      setError(t(pair[0], pair[1]));
    } finally { setBusy(false); }
  }

  async function googleSignIn() {
    setError(''); setBusy(true);
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next?.startsWith('/dashboard') && !next.startsWith('//') ? next : '/trips/bookings';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error: authError } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } });
      if (authError) throw new Error('google');
    } catch {
      setError(t('تعذر بدء تسجيل الدخول باستخدام Google. تأكد من إعداد مزود Google في Supabase.','Could not start Google sign-in. Check that the Google provider is configured in Supabase.'));
      setBusy(false);
    }
  }

  const title = mode === 'login' ? t('مرحبًا بعودتك','Welcome back') : mode === 'signup' ? t('أنشئ حسابك','Create your account') : mode === 'forgot' ? t('استعادة كلمة المرور','Reset your password') : t('كلمة مرور جديدة','Choose a new password');
  const submitLabel = mode === 'login' ? t('تسجيل الدخول','Sign in') : mode === 'signup' ? t('إنشاء الحساب','Create account') : mode === 'forgot' ? t('إرسال رابط الاستعادة','Send reset link') : t('حفظ كلمة المرور','Save password');

  return <main className="app-shell relative grid min-h-screen place-items-center p-4 sm:p-6">
    <div className="absolute end-4 top-4"><LanguageSwitcher /></div>
    <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-xl shadow-emerald-950/10 md:grid-cols-[.9fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-[var(--brand-deep)] p-10 text-white md:flex">
        <Link href="/" className="inline-flex items-center gap-3"><Image src="/brand/alqirsh-logo.png" alt="Alqirsh" width={64} height={64} className="rounded-xl"/><span className="text-xl font-black">القرش <span className="text-sm font-semibold">Alqirsh</span></span></Link>
        <div><h1 className="text-3xl font-black leading-tight">{t('منصة واحدة لخدماتك','One place for your Alqirsh services')}</h1><p className="mt-4 leading-7 text-emerald-100">{t('سجّل الدخول لمتابعة حجوزاتك واستخدام الخدمات المتاحة لحسابك.','Sign in to manage your bookings and access the services available to your account.')}</p></div>
        <p className="text-xs text-emerald-200">© Alqirsh</p>
      </aside>
      <form onSubmit={submit} className="p-6 sm:p-9">
        <Link href="/" className="text-sm font-bold text-[var(--brand)]">{t('العودة إلى الموقع','Back to website')}</Link>
        <div className="mt-6 flex items-center gap-3 md:hidden"><Image src="/brand/alqirsh-logo.png" alt="Alqirsh" width={48} height={48} className="rounded-lg"/><span className="font-black">القرش Alqirsh</span></div>
        <h2 className="mt-5 text-2xl font-black sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{mode === 'login' ? t('أدخل بيانات حسابك للمتابعة.','Sign in to continue.') : mode === 'signup' ? t('أنشئ حساب عميل. تمنح صلاحيات الإدارة من قاعدة البيانات بشكل منفصل.','Create a customer account. Administrative access is granted separately in the database.') : mode === 'forgot' ? t('أدخل بريدك لإرسال رابط آمن لاستعادة كلمة المرور.','Enter your email to receive a secure password reset link.') : t('أدخل كلمة مرور جديدة لحسابك.','Enter a new password for your account.')}</p>
        {notice === 'inactive' && <p role="alert" className="mt-4 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-900">{t('الحساب موقوف أو غير نشط. تواصل مع إدارة المنصة.','This account is inactive. Contact the platform administrator.')}</p>}
        {notice === 'unapproved' && <p role="alert" className="mt-4 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-900">{t('لم يتم ربط هذا الحساب بسجل مستخدم معتمد.','This account is not linked to an approved user record.')}</p>}
        {notice === 'oauth' && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{t('تعذر إكمال تسجيل الدخول باستخدام Google. حاول مرة أخرى.','Google sign-in could not be completed. Please try again.')}</p>}
        {notice === 'signedout' && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{t('تم تسجيل الخروج بنجاح.','You have signed out successfully.')}</p>}
        {mode === 'signup' && <label className="mt-5 block text-sm font-bold">{t('الاسم الكامل','Full name')}<div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3"><UserRound size={18}/><input required minLength={2} maxLength={120} value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" className="w-full bg-transparent py-3 outline-none"/></div></label>}
        {(mode === 'login' || mode === 'signup' || mode === 'forgot') && <>
          <label className="mt-5 block text-sm font-bold">{t('البريد الإلكتروني','Email address')}<div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3"><Mail size={18}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" dir="ltr" className="w-full bg-transparent py-3 text-left outline-none"/></div></label>
          {mode === 'signup' && <label className="mt-4 block text-sm font-bold">{t('رقم الهاتف (اختياري)','Phone (optional)')}<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" dir="auto" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-3"/></label>}
        </>}
        {(mode === 'login' || mode === 'signup' || mode === 'reset') && <>
          <label className="mt-5 block text-sm font-bold">{mode === 'reset' ? t('كلمة المرور الجديدة','New password') : t('كلمة المرور','Password')}<div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] px-3"><LockKeyhole size={18}/><input required minLength={mode === 'login' ? 1 : 8} value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} autoComplete={mode === 'login'?'current-password':'new-password'} className="w-full bg-transparent py-3 outline-none"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?t('إخفاء كلمة المرور','Hide password'):t('إظهار كلمة المرور','Show password')} className="grid size-9 place-items-center">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          {(mode === 'signup' || mode === 'reset') && <><div className="mt-2 flex gap-1" aria-label={t('قوة كلمة المرور','Password strength')}>{[1,2,3].map(level=><span key={level} className={`h-1.5 flex-1 rounded-full ${passwordStrength >= level ? passwordStrength === 3 ? 'bg-emerald-500' : 'bg-amber-500' : 'bg-[var(--line)]'}`}/>)}</div><p className="mt-1 text-xs text-[var(--muted)]">{t('استخدم 8 أحرف على الأقل مع أرقام وأحرف.','Use at least 8 characters with letters and numbers.')}</p><label className="mt-4 block text-sm font-bold">{t('تأكيد كلمة المرور','Confirm password')}<input required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} type={showPassword?'text':'password'} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-3"/></label></>}
        </>}
        {mode === 'signup' && <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} className="mt-1"/><span>{t('أوافق على','I agree to the')} <Link className="font-bold text-[var(--brand)]" href="/terms">{t('الشروط','Terms')}</Link> {t('و','and')} <Link className="font-bold text-[var(--brand)]" href="/privacy-policy">{t('سياسة الخصوصية','Privacy Policy')}</Link></span></label>}
        {mode === 'login' && <div className="mt-3 text-end"><Link href="/forgot-password" className="text-sm font-semibold text-[var(--brand)]">{t('نسيت كلمة المرور؟','Forgot password?')}</Link></div>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{success}</p>}
        <button disabled={busy} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 font-bold text-white disabled:opacity-60">{busy?t('جارٍ التنفيذ…','Please wait…'):submitLabel}</button>
        {(mode === 'login' || mode === 'signup') && <><div className="my-4 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--line)]"/>{t('أو','OR')}<span className="h-px flex-1 bg-[var(--line)]"/></div><button type="button" disabled={busy} onClick={()=>void googleSignIn()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--line)] px-4 font-bold"><GoogleMark/>{t('المتابعة باستخدام Google','Continue with Google')}</button></>}
        <div className="mt-5 text-center text-sm">{mode === 'login' ? <p>{t('ليس لديك حساب؟','New to Alqirsh?')} <Link href="/signup" className="font-bold text-[var(--brand)]">{t('إنشاء حساب','Create account')}</Link></p> : mode === 'signup' ? <p>{t('لديك حساب بالفعل؟','Already have an account?')} <Link href="/login" className="font-bold text-[var(--brand)]">{t('تسجيل الدخول','Sign in')}</Link></p> : <Link href="/login" className="font-bold text-[var(--brand)]">{t('العودة لتسجيل الدخول','Back to sign in')}</Link>}</div>
      </form>
    </section>
  </main>;
}

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.91c-.58 2.96-2.25 5.48-4.74 7.18l7.73 6C44.4 37.95 47 31.8 47 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"/></svg>;
}
