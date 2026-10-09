import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يلزم تسجيل الدخول.' }, { status: 401 });
  const { data: actor } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (actor?.role !== 'admin') return NextResponse.json({ error: 'غير مصرح بإدارة الصلاحيات.' }, { status: 403 });
  const { id } = await context.params;
  const { data: target, error: targetError } = await db.from('profiles').select('id').eq('id', id).maybeSingle();
  if (targetError || !target) return NextResponse.json({ error: 'المستخدم غير موجود.' }, { status: 404 });
  const { data: permissions, error } = await db.from('section_permissions').select('*').eq('user_id', id).maybeSingle();
  if (error) return NextResponse.json({ error: 'تعذر تحميل صلاحيات المستخدم.' }, { status: 500 });
  return NextResponse.json({ permissions: permissions ?? {} }, { headers: { 'Cache-Control': 'no-store' } });
}
