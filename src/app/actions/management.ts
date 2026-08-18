'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const allowed = new Set(['property_owners', 'managed_properties', 'managed_tenants', 'managed_units', 'lease_contracts', 'rent_payments', 'maintenance_requests', 'requests']);

async function authorize() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولاً.');
  const { data: profile, error } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (error || !profile || !['admin', 'property_manager'].includes(profile.role)) throw new Error('ليس لديك صلاحية إدارة الأملاك.');
  return db;
}

function clean(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value === '' ? null : value]));
}

export async function saveManagedEntity(table: string, id: string | null, payload: Record<string, unknown>) {
  if (!allowed.has(table)) throw new Error('نوع السجل غير مسموح.');
  const db = await authorize();
  const values = clean(payload);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const [key, value] of Object.entries(values)) {
    if (key.endsWith('_id') && value !== null && typeof value === 'string' && !uuidPattern.test(value)) {
      throw new Error(`قيمة ${key} يجب اختيارها من القائمة المسجلة.`);
    }
    // Validate date fields
    if (key.endsWith('_date') && value !== null && typeof value === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`قيمة ${key} غير صحيحة. يجب أن تكون بصيغة YYYY-MM-DD.`);
      }
    }
  }
  if (table === 'requests' && !id) {
    const { data: { user } } = await db.auth.getUser();
    values.created_by = user!.id;
  }
  try {
    const query = id ? db.from(table).update(values).eq('id', id) : db.from(table).insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
  } catch (error) {
    if (error instanceof Error && error.message.includes('invalid input syntax for type date')) {
      throw new Error('قيمة التاريخ المدخلة غير صحيحة. تأكد من صيغة التاريخ YYYY-MM-DD.');
    }
    throw error;
  }
  revalidatePath('/dashboard/property-management', 'layout');
  revalidatePath('/dashboard/requests');
}

export async function deleteManagedEntity(table: string, id: string) {
  if (!allowed.has(table)) throw new Error('نوع السجل غير مسموح.');
  const db = await authorize();
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/property-management', 'layout');
  revalidatePath('/dashboard/requests');
}
