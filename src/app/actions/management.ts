'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const allowed = new Set(['property_owners', 'managed_properties', 'managed_tenants', 'managed_units', 'lease_contracts', 'rent_payments', 'maintenance_requests', 'requests']);

async function authorize(permission = 'properties.management.manage') {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولًا.');
  const { data: hasPermission, error } = await db.rpc('has_section_permission', { permission_name: permission });
  if (error || !hasPermission) throw new Error('ليس لديك صلاحية لتنفيذ هذه العملية.');
  return db;
}

function clean(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === '' ? null : value]));
}

export async function saveManagedEntity(table: string, id: string | null, payload: Record<string, unknown>) {
  if (!allowed.has(table)) throw new Error('نوع السجل غير مسموح.');
  const db = await authorize(table === 'requests' ? 'properties.requests.manage' : 'properties.management.manage');
  const values = clean(payload);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const [key, value] of Object.entries(values)) {
    if (key.endsWith('_id') && value !== null && typeof value === 'string' && !uuidPattern.test(value)) {
      throw new Error(`يجب اختيار ${key} من القائمة.`);
    }
    if (key.endsWith('_date') && value !== null && typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`صيغة ${key} غير صحيحة. استخدم YYYY-MM-DD.`);
    }
  }
  if (table === 'requests' && !id) {
    const { data: { user } } = await db.auth.getUser();
    values.created_by = user!.id;
  }
  try {
    const query = id ? db.from(table).update(values).eq('id', id).select('id') : db.from(table).insert(values).select('id');
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) throw new Error('NO_ROW_AFFECTED');
  } catch (error) {
    if (error instanceof Error && error.message.includes('invalid input syntax for type date')) {
      throw new Error('التاريخ المدخل غير صحيح. تأكد من استخدام الصيغة YYYY-MM-DD.');
    }
    console.error('تعذر حفظ سجل إدارة الأملاك.', error);
    throw new Error('تعذر حفظ البيانات. يُرجى المحاولة مرة أخرى.');
  }
  revalidatePath('/dashboard/property-management', 'layout');
  revalidatePath('/dashboard/requests');
}

export async function deleteManagedEntity(table: string, id: string) {
  if (!allowed.has(table)) throw new Error('نوع السجل غير مسموح.');
  const db = await authorize(table === 'requests' ? 'properties.requests.manage' : 'properties.management.manage');
  const { data, error } = await db.from(table).delete().eq('id', id).select('id');
  if (error) {
    console.error('تعذر حذف سجل إدارة الأملاك.', error);
    throw new Error('تعذر حذف البيانات. يُرجى المحاولة مرة أخرى.');
  }
  if (!data?.length) throw new Error('تعذر حذف السجل؛ قد لا تملك الصلاحية أو أن السجل لم يعد موجودًا.');
  revalidatePath('/dashboard/property-management', 'layout');
  revalidatePath('/dashboard/requests');
}
