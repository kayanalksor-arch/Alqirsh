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

export async function createDashboardUser(input: { fullName: string; email: string; password: string; role: 'admin'|'property_manager'|'member'; status: 'active'|'inactive' }) {
  await authorizeAdmin();
  if (!input.fullName.trim() || !/^\S+@\S+\.\S+$/.test(input.email) || input.password.length < 8) throw new Error('أدخل اسماً وبريداً صحيحاً وكلمة مرور من 8 أحرف على الأقل.');
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: input.email.trim().toLowerCase(), password: input.password, email_confirm: true, user_metadata: { full_name: input.fullName.trim() }, app_metadata: { status: input.status } });
  if (error || !data.user) throw new Error(error?.message ?? 'تعذر إنشاء المستخدم.');
  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, full_name: input.fullName.trim(), email: input.email.trim().toLowerCase(), role: input.role, status: input.status }, { onConflict: 'id' });
  if (profileError) { await admin.auth.admin.deleteUser(data.user.id); throw new Error(profileError.message); }
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

  revalidatePath('/dashboard/users');
}
