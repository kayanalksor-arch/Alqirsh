'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function authorizeAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', user.id).single();
  if (profile?.status === 'inactive') throw new Error('الحساب غير نشط.');
  if (profile?.role !== 'admin') throw new Error('هذه العملية متاحة لمدير النظام فقط.');
  return user;
}

function userCreationError(error: { code?: string; message?: string } | null, fallback: string) {
  const code = error?.code?.toLowerCase() ?? '';
  const message = error?.message?.toLowerCase() ?? '';
  if (code === 'email_exists' || message.includes('already registered') || message.includes('already been registered') || message.includes('email_exists')) {
    return new Error('هذا البريد الإلكتروني مسجل بالفعل. استخدم بريدًا آخر.');
  }
  if (code === 'weak_password' || message.includes('weak password') || message.includes('password should')) {
    return new Error('كلمة المرور لا تستوفي متطلبات الأمان. اختر كلمة مرور أقوى.');
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return new Error('تعذر إنشاء الحساب الآن بسبب كثرة المحاولات. يُرجى الانتظار ثم المحاولة مجددًا.');
  }
  return new Error(fallback);
}

async function recordUserAction(actorId:string,action:string,targetId:string,description:string){
  const admin=createAdminClient();
  const {data:actor}=await admin.from('profiles').select('full_name,email').eq('id',actorId).maybeSingle();
  const {data:target}=await admin.from('profiles').select('full_name').eq('id',targetId).maybeSingle();
  await admin.from('activity_logs').insert({actor_id:actorId,actor_name:actor?.full_name,actor_email:actor?.email,section:'users',action,entity_id:targetId,entity_label:target?.full_name??targetId,description,sensitive:true,details:{}});
}

function createUserAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    console.error('[dashboard/users] Admin client is not configured:', error);
    throw new Error('تعذر إعداد إنشاء الحساب. يُرجى التواصل مع مدير النظام.');
  }
}

const assignablePermissionKeys = ['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_sale_status','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete','properties_rent_status','properties_images_manage','properties_requests_view','properties_requests_manage','properties_management_view','properties_management_manage','cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete','cars_images_manage','bookings_view','bookings_create','bookings_update','bookings_cancel','bookings_customer_details','users_permissions_manage','activity_logs_view'] as const;

export async function createDashboardUser(input: { fullName: string; email: string; phone?: string; password: string; role: 'admin'|'property_manager'|'member'; status: 'active'|'inactive'; permissions?: Record<string, boolean> }) {
  const actor=await authorizeAdmin();
  if (!input || typeof input.fullName !== 'string' || typeof input.email !== 'string' || typeof input.password !== 'string') {
    throw new Error('أكمل بيانات المستخدم المطلوبة.');
  }
  if (!['member', 'property_manager'].includes(input.role)) throw new Error('الدور المحدد غير متاح.');
  if (!['active', 'inactive'].includes(input.status)) throw new Error('حالة الحساب المحددة غير صالحة.');
  if (input.fullName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(input.email.trim()) || input.password.length < 8 || (input.phone !== undefined && typeof input.phone !== 'string')) throw new Error('تحقق من الاسم والبريد الإلكتروني وكلمة المرور. يجب ألا تقل كلمة المرور عن 8 أحرف.');
  if (input.role === 'admin') throw new Error('إنشاء حساب مدير عام من هذه النافذة غير متاح.');
  const permissions=input.permissions??{};
  if(Object.keys(permissions).some(key=>!assignablePermissionKeys.includes(key as typeof assignablePermissionKeys[number]))||assignablePermissionKeys.some(key=>typeof permissions[key]!=='boolean')) throw new Error('الصلاحيات المرسلة غير صالحة.');
  const admin = createUserAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: input.email.trim().toLowerCase(), password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName.trim() }, app_metadata: { status: input.status } }).catch((caught: unknown) => {
    console.error('[dashboard/users] Auth account request threw:', caught);
    const message = caught instanceof Error ? caught.message : '';
    throw userCreationError({ message }, 'تعذر إنشاء الحساب. يُرجى المحاولة مرة أخرى.');
  });
  if (error || !data.user) { console.error('[dashboard/users] Auth account creation failed:', error); throw userCreationError(error ?? null, '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u064f\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'); }
  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, full_name: input.fullName.trim(), email: input.email.trim().toLowerCase(), phone: input.phone?.trim() || null, role: input.role, status: input.status }, { onConflict: 'id' });
  if (profileError) { const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id); console.error('[dashboard/users] Profile save failed:', { profileError, cleanupError }); throw new Error(cleanupError ? '\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u060c \u0648\u0644\u0645 \u064a\u0645\u0643\u0646 \u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u064f\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0645.' : '\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645. \u0644\u0645 \u064a\u064f\u0646\u0634\u0623 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u064f\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'); }
  const permissionRow=Object.fromEntries(assignablePermissionKeys.map(key=>[key,permissions[key]===true]));
  const {error:permissionError}=await admin.from('section_permissions').upsert({user_id:data.user.id,...permissionRow,updated_at:new Date().toISOString(),updated_by:actor.id},{onConflict:'user_id'});
  if (permissionError) { const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id); console.error('[dashboard/users] Permission save failed:', { permissionError, cleanupError }); throw new Error(cleanupError ? '\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a\u060c \u0648\u0644\u0645 \u064a\u0645\u0643\u0646 \u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u064f\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0645.' : '\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a. \u0644\u0645 \u064a\u064f\u0646\u0634\u0623 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u064f\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'); }
  await recordUserAction(actor.id,'create',data.user.id,'تم إنشاء مستخدم.');
  revalidatePath('/dashboard/users');
}

export async function updateDashboardUser(id: string, input: { fullName: string; role: 'admin'|'property_manager'|'member'; status: 'active'|'inactive' }) {
  const actor = await authorizeAdmin();
  const admin = createAdminClient();
  if (id === actor.id && input.status === 'inactive') throw new Error('لا يمكنك تعطيل حسابك الحالي.');
  const { error } = await admin.from('profiles').update({ full_name: input.fullName.trim(), role: input.role, status: input.status }).eq('id', id);
  if (error) throw new Error(error.message);
  const { error: authError } = await admin.auth.admin.updateUserById(id, { app_metadata: { status: input.status }, user_metadata: { full_name: input.fullName.trim() } });
  if (authError) throw new Error(authError.message);
  await recordUserAction(actor.id,'update',id,'تم تحديث بيانات المستخدم أو دوره أو حالته.');
  revalidatePath('/dashboard/users');
}

export async function deactivateDashboardUser(id: string) {
  const actor = await authorizeAdmin();
  if (id === actor.id) throw new Error('لا يمكنك تعطيل حسابك الحالي.');
  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles').select('email,role').eq('id', id).single();
  if (target?.email?.toLowerCase() === 'ca.markode@gmail.com' || target?.role === 'admin') throw new Error('لا يمكن تعطيل حساب مدير النظام.');
  const { error } = await admin.from('profiles').update({ status: 'inactive' }).eq('id', id);
  if (error) throw new Error(error.message);
  const { error: authError } = await admin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
  if (authError) throw new Error(authError.message);
  await recordUserAction(actor.id,'deactivate',id,'تم إيقاف حساب المستخدم.');
  revalidatePath('/dashboard/users');
}

export async function deleteDashboardUser(id: string) {
  const actor = await authorizeAdmin();
  if (id === actor.id) throw new Error('لا يمكنك حذف حسابك الحالي.');

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin.from('profiles').select('email,role,avatar_url').eq('id', id).single();
  if (targetError && targetError.code !== 'PGRST116') throw new Error(targetError.message);
  if (!target) throw new Error('المستخدم غير موجود.');
  if (target.email?.toLowerCase() === 'ca.markode@gmail.com' || target.role === 'admin') throw new Error('لا يمكن حذف حساب مدير النظام.');

  if (target.avatar_url) {
    try {
      const match = target.avatar_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bucket, filePath] = match;
        const decodedPath = decodeURIComponent(filePath);
        await admin.storage.from(bucket).remove([decodedPath]);
      }
    } catch {
      // Ignore file cleanup issues and continue with account deletion.
    }
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', id);
  if (profileError) throw new Error(profileError.message);

  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) throw new Error(authError.message);
  await recordUserAction(actor.id,'delete',id,'تم حذف حساب المستخدم.');

  revalidatePath('/dashboard/users');
}
