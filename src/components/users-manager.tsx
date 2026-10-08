'use client';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDashboardUser, deactivateDashboardUser, deleteDashboardUser, updateDashboardUser } from '@/app/actions/users';
import { saveUnifiedPermissions } from '@/app/actions/vehicles';
import { roleLabel } from '@/lib/listings';

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'property_manager' | 'member';
  status: 'active' | 'inactive';
  created_at: string | null;
  vehicle_permissions?: Array<Record<string, boolean>>;
  section_permissions?: Array<Record<string, boolean|string>>;
};
const permissionGroups:[string,string[]][]=[['عقارات البيع',['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_sale_status']],['عقارات الإيجار',['properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete','properties_rent_status']],['إدارة الأملاك',['properties_management_view','properties_management_manage']],['السيارات للبيع',['cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete']],['السيارات للإيجار',['cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete','cars_images_manage']],['الحجوزات',['bookings_view','bookings_create','bookings_update','bookings_cancel','bookings_customer_details']],['المرفقات والطلبات',['properties_images_manage','properties_requests_view','properties_requests_manage']],['إدارة المستخدمين والسجل',['users_permissions_manage','activity_logs_view']]];
const permissionLabels:Record<string,string>={properties_sale_view:'عرض',properties_sale_create:'إضافة',properties_sale_update:'تعديل',properties_sale_delete:'أرشفة أو حذف',properties_sale_status:'تغيير الحالة',properties_rent_view:'عرض',properties_rent_create:'إضافة',properties_rent_update:'تعديل',properties_rent_delete:'أرشفة أو حذف',properties_rent_status:'تغيير الحالة',properties_management_view:'عرض سجلات الأملاك',properties_management_manage:'إدارة سجلات الأملاك',cars_sale_view:'عرض',cars_sale_create:'إضافة',cars_sale_update:'تعديل',cars_sale_delete:'أرشفة أو حذف',cars_rent_view:'عرض',cars_rent_create:'إضافة',cars_rent_update:'تعديل',cars_rent_delete:'أرشفة أو حذف',cars_images_manage:'إدارة الصور',bookings_view:'عرض الحجوزات',bookings_create:'إنشاء حجز',bookings_update:'تعديل الحجز',bookings_cancel:'إلغاء الحجز',bookings_customer_details:'عرض بيانات العملاء',properties_images_manage:'إدارة الصور والمرفقات',properties_requests_view:'عرض الطلبات',properties_requests_manage:'إدارة الطلبات',users_permissions_manage:'إدارة المستخدمين والصلاحيات',activity_logs_view:'عرض سجل الحركة'};

const empty: {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'property_manager' | 'member';
  status: 'active' | 'inactive';
} = {
  fullName: '',
  email: '',
  password: '',
  role: 'member',
  status: 'active',
};

export function UsersManager({ users }: { users: User[] }) {
  const router=useRouter();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [permissionsUser,setPermissionsUser]=useState<User|null>(null);
  const [vehiclePermissions,setVehiclePermissions]=useState<Record<string,boolean>>({});

  const shown = useMemo(
    () =>
      users.filter(
        (u) =>
          (!q || `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase())) &&
          (!role || u.role === role) &&
          (!status || u.status === status),
      ),
    [users, q, role, status],
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateDashboardUser(editing.id, {
          fullName: form.fullName,
          role: form.role,
          status: form.status,
        });
      } else {
        await createDashboardUser(form);
      }

      setMessage('تم حفظ المستخدم بنجاح.');
      setForm(empty);
      setEditing(null);
      setIsFormOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'تعذر حفظ المستخدم.');
    } finally {
      setSaving(false);
    }
  }

  function open(u?: User) {
    setEditing(u ?? null);
    setForm(
      u
        ? { fullName: u.full_name ?? '', email: u.email ?? '', password: '', role: u.role, status: u.status }
        : empty,
    );
    setIsFormOpen(true);
  }

  return (
    <main className="p-5 lg:p-9">
      <div className="panel flex flex-wrap gap-3 rounded-2xl p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-11 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3"
          placeholder="بحث بالاسم أو البريد"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3"
        >
          <option value="">كل الأدوار</option>
          <option value="admin">مدير النظام</option>
          <option value="property_manager">مدير أملاك</option>
          <option value="member">عضو</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>

        <button
          type="button"
          onClick={() => open()}
          className="min-h-11 rounded-xl bg-[var(--brand)] px-4 font-bold text-white"
        >
          + إضافة مستخدم
        </button>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl border border-[var(--line)] p-3">{message}</p>}

      <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {shown.map((u) => (
          <article key={u.id} className="panel rounded-2xl p-5">
            <h2 className="font-black">{u.full_name || 'مستخدم بلا اسم'}</h2>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{u.email}</p>
            <p className="mt-3 text-sm">{roleLabel(u.role)} · {u.status === 'active' ? 'نشط' : 'غير نشط'}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => open(u)}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold"
              >
                تعديل
              </button>
              <button type="button" onClick={()=>{setPermissionsUser(u);setVehiclePermissions(u.section_permissions?.[0] as Record<string,boolean>??{});}} className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-bold">الصلاحيات</button>

              <button
                type="button"
                onClick={async () => {
                  if (!confirm('هل أنت متأكد من تفعيل هذا المستخدم؟')) return;
                  try {
                    await deactivateDashboardUser(u.id);
                    setMessage('تم تفعيل المستخدم بنجاح.');
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : 'تعذر التفعيل.');
                  }
                }}
                className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-700"
              >
                تفعيل
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟ سيتم حذف الحساب من التطبيق ومن التخزين.')) return;
                  try {
                    await deleteDashboardUser(u.id);
                    setMessage('تم حذف المستخدم نهائياً.');
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : 'تعذر حذف المستخدم.');
                  }
                }}
                className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700"
              >
                حذف
              </button>
            </div>
          </article>
        ))}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-6">
            <h2 className="text-xl font-black">{editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}</h2>

            <div className="mt-4 grid gap-3">
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="الاسم"
                className="rounded-xl border border-[var(--line)] bg-transparent p-3"
              />

              {!editing && (
                <>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="البريد الإلكتروني"
                    className="rounded-xl border border-[var(--line)] bg-transparent p-3"
                  />

                  <input
                    required
                    minLength={8}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="كلمة المرور"
                    className="rounded-xl border border-[var(--line)] bg-transparent p-3"
                  />
                </>
              )}

              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <option value="member">عضو</option>
                <option value="property_manager">مدير أملاك</option>
                <option value="admin">مدير النظام</option>
              </select>

              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={saving} className="rounded-xl bg-[var(--brand)] px-4 py-3 font-bold text-white">
                حفظ
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(empty);
                  setIsFormOpen(false);
                }}
                className="rounded-xl border border-[var(--line)] px-4 py-3 font-bold"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
      {permissionsUser&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[var(--surface)] p-6" dir="rtl"><h2 className="text-xl font-black">صلاحيات {permissionsUser.full_name||permissionsUser.email}</h2><p className="mt-1 text-sm text-[var(--muted)]">الدور: {roleLabel(permissionsUser.role)} · الحالة: {permissionsUser.status==='active'?'نشط':'غير نشط'}</p>{permissionGroups.map(([group,keys])=><fieldset key={group} className="mt-5 rounded-2xl border border-[var(--line)] p-4"><legend className="px-2 font-black">{group}</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{keys.map(key=><label key={key} className="flex items-center gap-2 rounded-lg p-2 text-sm"><input type="checkbox" checked={vehiclePermissions[key]===true} onChange={event=>setVehiclePermissions({...vehiclePermissions,[key]:event.target.checked})}/>{permissionLabels[key]}</label>)}</div></fieldset>)}<p className="mt-3 text-xs text-[var(--muted)]">آخر تحديث: {String(permissionsUser.section_permissions?.[0]?.updated_at??'لا يوجد')}</p><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setPermissionsUser(null)} className="rounded-xl border border-[var(--line)] px-4 py-2">إلغاء</button><button disabled={saving} onClick={async()=>{setSaving(true);try{await saveUnifiedPermissions(permissionsUser.id,vehiclePermissions);setMessage('تم حفظ الصلاحيات.');setPermissionsUser(null);router.refresh();}catch(error){setMessage(error instanceof Error?error.message:'تعذر حفظ الصلاحيات.');}finally{setSaving(false);}}} className="rounded-xl bg-[var(--brand)] px-4 py-2 font-bold text-white">حفظ الصلاحيات</button></div></section></div>}
    </main>
  );
}
