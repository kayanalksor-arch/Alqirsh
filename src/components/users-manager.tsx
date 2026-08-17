'use client';
import { FormEvent, useMemo, useState } from 'react';
import { createDashboardUser, deactivateDashboardUser, deleteDashboardUser, updateDashboardUser } from '@/app/actions/users';

type User = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'property_manager' | 'member';
  status: 'active' | 'inactive';
  created_at: string | null;
};

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
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

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

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((u) => (
          <article key={u.id} className="panel rounded-2xl p-5">
            <h2 className="font-black">{u.full_name || 'مستخدم بلا اسم'}</h2>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{u.email}</p>
            <p className="mt-3 text-sm">{u.role} · {u.status === 'active' ? 'نشط' : 'غير نشط'}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => open(u)}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-bold"
              >
                تعديل
              </button>

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
    </main>
  );
}
