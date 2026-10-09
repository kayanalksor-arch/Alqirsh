'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function authorizeAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('هذه العملية متاحة لمدير النظام فقط.');
  return user;
}

async function recordUserAction(actorId:string,action:string,targetId:string,description:string){
  const admin=createAdminClient();
  const {data:actor}=await admin.from('profiles').select('full_name,email').eq('id',actorId).maybeSingle();
  const {data:target}=await admin.from('profiles').select('full_name').eq('id',targetId).maybeSingle();
  await admin.from('activity_logs').insert({actor_id:actorId,actor_name:actor?.full_name,actor_email:actor?.email,section:'users',action,entity_id:targetId,entity_label:target?.full_name??targetId,description,sensitive:true,details:{}});
}

const assignablePermissionKeys = ['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_sale_status','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete','properties_rent_status','properties_images_manage','properties_requests_view','properties_requests_manage','properties_management_view','properties_management_manage','cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete','cars_images_manage','bookings_view','bookings_create','bookings_update','bookings_cancel','bookings_customer_details','users_permissions_manage','activity_logs_view'] as const;

export async function createDashboardUser(input: { fullName: string; email: string; phone?: string; password: string; role: 'admin'|'property_manager'|'member'; status: 'active'|'inactive'; permissions?: Record<string, boolean> }) {
  const actor=await authorizeAdmin();
  if (!input.fullName.trim() || !/^\S+@\S+\.\S+$/.test(input.email) || input.password.length < 8) throw new Error('أدخل اسماً وبريداً صحيحاً وكلمة مرور من 8 أحرف على الأقل.');
  if (input.role === 'admin') throw new Error('إنشاء حساب مدير عام من هذه النافذة غير متاح.');
  const permissions=input.permissions??{};
  if(Object.keys(permissions).some(key=>!assignablePermissionKeys.includes(key as typeof assignablePermissionKeys[number]))||assignablePermissionKeys.some(key=>typeof permissions[key]!=='boolean')) throw new Error('الصلاحيات المرسلة غير صالحة.');
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: input.email.trim().toLowerCase(), password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName.trim() }, app_metadata: { status: input.status } });
  if (error || !data.user) throw new Error(error?.message ?? 'تعذر إنشاء المستخدم.');
  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, full_name: input.fullName.trim(), email: input.email.trim().toLowerCase(), phone: input.phone?.trim() || null, role: input.role, status: input.status }, { onConflict: 'id' });
  if (profileError) { await admin.auth.admin.deleteUser(data.user.id); throw new Error(profileError.message); }
  const permissionRow=Object.fromEntries(assignablePermissionKeys.map(key=>[key,permissions[key]===true]));
  const {error:permissionError}=await admin.from('section_permissions').upsert({user_id:data.user.id,...permissionRow,updated_at:new Date().toISOString(),updated_by:actor.id},{onConflict:'user_id'});
  if(permissionError){await admin.from('profiles').delete().eq('id',data.user.id);await admin.auth.admin.deleteUser(data.user.id);throw new Error(`تعذر حفظ الصلاحيات؛ أُلغي إنشاء الحساب. ${permissionError.message}`);}
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
