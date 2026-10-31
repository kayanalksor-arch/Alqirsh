'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function authorizeAdmin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', user.id).single();
  if (profile?.status !== 'active' || profile?.role !== 'admin') {
    await db.rpc('record_denied_admin_access', { p_path: '/server-actions/users' });
    throw new Error('\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0645\u062a\u0627\u062d\u0629 \u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0641\u0642\u0637.');
  }
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

const assignablePermissionKeys = ['bus_fleet_view','bus_fleet_manage','bus_trips_view','bus_trips_manage','bus_bookings_view','bus_bookings_manage','bus_receipts_review','bus_tickets_issue','bus_qr_scan','bus_boarding_record','bus_cash_collect','bus_finance_view','bus_expenses_manage','bus_refunds_manage','bus_audit_view','bus_reports_export','properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_sale_status','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete','properties_rent_status','properties_images_manage','properties_requests_view','properties_requests_manage','properties_management_view','properties_management_manage','cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete','cars_images_manage','bookings_view','bookings_create','bookings_update','bookings_cancel','bookings_customer_details','users_permissions_manage','activity_logs_view'] as const;

export async function createDashboardUser(input: { fullName: string; email: string; phone?: string; role: 'admin'|'property_manager'|'member'; status: 'active'|'inactive'; permissions?: Record<string, boolean> }) {
  const actor = await authorizeAdmin();
  if (!input || typeof input.fullName !== 'string' || typeof input.email !== 'string') throw new Error('\u0623\u0643\u0645\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.');
  if (!['member', 'property_manager'].includes(input.role)) throw new Error('\u0627\u0644\u062f\u0648\u0631 \u0627\u0644\u0645\u062d\u062f\u062f \u063a\u064a\u0631 \u0645\u062a\u0627\u062d.');
  if (!['active', 'inactive'].includes(input.status)) throw new Error('\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062d\u062f\u062f\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629.');
  if (input.fullName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(input.email.trim()) || (input.phone !== undefined && typeof input.phone !== 'string')) throw new Error('\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.');
  const permissions = input.permissions ?? {};
  if (Object.keys(permissions).some(key => !assignablePermissionKeys.includes(key as typeof assignablePermissionKeys[number])) || assignablePermissionKeys.some(key => typeof permissions[key] !== 'boolean')) throw new Error('\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u0631\u0633\u0644\u0629 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d\u0629.');
  const admin = createUserAdminClient();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alqirsh.online').replace(/\/$/u, '');
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email.trim().toLowerCase(), {
    data: { full_name: input.fullName.trim(), phone: input.phone?.trim() || null },
    redirectTo: siteUrl + '/auth/callback?next=%2Fdashboard',
  });
  let targetUser = data.user;
  let invitationSent = Boolean(targetUser && !error);
  if (error || !targetUser) {
    const emailConflict = error?.code === 'email_exists' || error?.code === 'user_already_exists' || /already registered|already exists/i.test(error?.message ?? '');
    if (emailConflict) {
      for (let page = 1; page <= 100 && !targetUser; page += 1) {
        const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (result.error) break;
        targetUser = result.data.users.find((candidate) => candidate.email?.toLowerCase() === input.email.trim().toLowerCase()) ?? null;
        if (result.data.users.length < 1000) break;
      }
      if (targetUser && !targetUser.email_confirmed_at && !targetUser.confirmed_at) {
        throw new Error('\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0645\u0633\u062c\u0644 \u0648\u0644\u0645 \u064a\u064f\u0624\u0643\u0651\u062f \u0628\u0639\u062f. \u064a\u062c\u0628 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0642\u0628\u0644 \u0631\u0628\u0637 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a.');
      }
      invitationSent = false;
    }
    if (!targetUser) {
      console.error('[dashboard/users] User invitation failed:', error);
      throw userCreationError(error ?? null, '\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u062f\u0639\u0648\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645. \u062a\u0623\u0643\u062f \u0645\u0646 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a.');
    }
  }
  const userId = targetUser.id;
  const rollback = async () => { if (!invitationSent) return; const result = await admin.auth.admin.deleteUser(userId); if (result.error) console.error('[dashboard/users] Invite rollback failed:', result.error); };
  const { error: profileError } = await admin.from('profiles').upsert({ id: userId, full_name: input.fullName.trim(), email: input.email.trim().toLowerCase(), phone: input.phone?.trim() || null, role: input.role, status: input.status }, { onConflict: 'id' });
  if (profileError) { await rollback(); console.error('[dashboard/users] Profile save failed:', profileError); throw new Error('\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.'); }
  const permissionRow = Object.fromEntries(assignablePermissionKeys.map(key => [key, permissions[key] === true]));
  const { error: permissionError } = await admin.from('section_permissions').upsert({ user_id: userId, ...permissionRow, updated_at: new Date().toISOString(), updated_by: actor.id }, { onConflict: 'user_id' });
  if (permissionError) { await rollback(); console.error('[dashboard/users] Permission save failed:', permissionError); throw new Error('\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.'); }
  if (input.status === 'inactive') {
    const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    if (banError) { await rollback(); throw new Error('\u062a\u0639\u0630\u0631 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u062d\u0633\u0627\u0628.'); }
  }
  await recordUserAction(actor.id, invitationSent ? 'invite' : 'link_existing', userId, invitationSent ? 'Invited a user and assigned approved section permissions' : 'Linked an existing verified account and assigned approved section permissions');
  revalidatePath('/dashboard/users');
  return invitationSent ? 'invited' : 'linked';
}

export async function updateDashboardUser(id: string, input: { fullName: string; role: 'admin'|'property_manager'|'member'; status: 'active'|'inactive' }) {
  const actor = await authorizeAdmin();
  const admin = createAdminClient();
  if (id === actor.id && input.role !== 'admin') throw new Error('\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u062a\u063a\u064a\u064a\u0631 \u062f\u0648\u0631 \u062d\u0633\u0627\u0628\u0643 \u0627\u0644\u0625\u062f\u0627\u0631\u064a.');
  if (id === actor.id && input.status === 'inactive') throw new Error('لا يمكنك تعطيل حسابك الحالي.');
  const { error } = await admin.from('profiles').update({ full_name: input.fullName.trim(), role: input.role, status: input.status }).eq('id', id);
  if (error) throw new Error(error.message);
  const { error: authError } = await admin.auth.admin.updateUserById(id, { app_metadata: { status: input.status }, user_metadata: { full_name: input.fullName.trim() }, ban_duration: input.status === 'active' ? 'none' : '876000h' });
  if (authError) throw new Error(authError.message);
  await recordUserAction(actor.id,'update',id,'تم تحديث بيانات المستخدم أو دوره أو حالته.');
  revalidatePath('/dashboard/users');
}

export async function deactivateDashboardUser(id: string) {
  const actor = await authorizeAdmin();
  if (id === actor.id) throw new Error('لا يمكنك تعطيل حسابك الحالي.');
  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles').select('email,role').eq('id', id).single();
  if (target?.role === 'admin') throw new Error('لا يمكن تعطيل حساب مدير النظام.');
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
  if (target.role === 'admin') throw new Error('لا يمكن حذف حساب مدير النظام.');

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
