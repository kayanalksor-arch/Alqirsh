import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard-shell';
import { ActivityLogManager } from '@/components/activity-log-manager';
import { createClient } from '@/lib/supabase/server';

export default async function ActivityLogPage(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();const {data:permission}=await db.from('section_permissions').select('activity_logs_view').eq('user_id',user.id).maybeSingle();
 if(profile?.role!=='admin'&&!permission?.activity_logs_view)return <DashboardShell><main className="p-8"><section className="panel rounded-2xl p-6">ليس لديك صلاحية الاطلاع على سجل حركة التطبيق.</section></main></DashboardShell>;
 return <DashboardShell><header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9"><p className="eyebrow">الرقابة والمراجعة</p><h1 className="mt-1 text-2xl font-black">سجل حركة التطبيق</h1><p className="mt-2 text-sm text-[var(--muted)]">سجل العمليات الإدارية والتغييرات المهمة المسجلة فعليًا.</p></header><ActivityLogManager/></DashboardShell>;
}
