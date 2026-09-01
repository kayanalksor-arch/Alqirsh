import { DashboardShell } from '@/components/dashboard-shell';
import { ManagedEntityManager } from '@/components/managed-entity-manager';
import { createClient } from '@/lib/supabase/server';

type OptionRow = {
  id: string | number;
  [key: string]: unknown;
};

export default async function ContractsPage() {
  const db = await createClient();
  const [properties, units, owners, tenants] = await Promise.all([
    db.from('managed_properties').select('id,name'),
    db.from('managed_units').select('id,unit_number'),
    db.from('property_owners').select('id,full_name'),
    db.from('managed_tenants').select('id,full_name'),
  ]);

  const opts = (rows: OptionRow[], key: string) => rows.map((row) => [String(row.id), String(row[key] ?? '')] as const);

  const config = {
    table: 'lease_contracts',
    title: 'عقود',
    singular: 'عقد',
    display: ['start_date', 'end_date', 'monthly_rent', 'status'] as const,
    fields: [
      { key: 'property_id', label: 'العقار', required: true, options: opts(properties.data ?? [], 'name') },
      { key: 'unit_id', label: 'الوحدة', required: true, options: opts(units.data ?? [], 'unit_number') },
      { key: 'owner_id', label: 'المالك', required: true, options: opts(owners.data ?? [], 'full_name') },
      { key: 'tenant_id', label: 'المستأجر', required: true, options: opts(tenants.data ?? [], 'full_name') },
      { key: 'start_date', label: 'تاريخ البداية', type: 'date' as const, required: true },
      { key: 'end_date', label: 'تاريخ النهاية', type: 'date' as const, required: true },
      { key: 'monthly_rent', label: 'الإيجار الشهري', type: 'number' as const, required: true },
      { key: 'deposit_amount', label: 'التأمين', type: 'number' as const },
      { key: 'status', label: 'الحالة', required: true, options: [['active', 'نشط'], ['expiring_soon', 'ينتهي قريباً'], ['expired', 'منتهٍ'], ['cancelled', 'ملغى']] as const },
      { key: 'notes', label: 'ملاحظات', type: 'textarea' as const },
    ],
  };

  return (
    <DashboardShell>
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-5 lg:px-9">
        <p className="eyebrow">إدارة الأملاك</p>
        <h1 className="mt-1 text-2xl font-black">العقود</h1>
      </header>
      <ManagedEntityManager config={config} />
    </DashboardShell>
  );
}

