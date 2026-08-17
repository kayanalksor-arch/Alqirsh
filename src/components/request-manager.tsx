'use client';

import { ManagedEntityManager } from '@/components/managed-entity-manager';

const config = {
  table: 'requests', title: 'طلبات', singular: 'طلب', display: ['customer_name', 'phone', 'request_type', 'status'] as const,
  fields: [
    { key: 'customer_name', label: 'اسم العميل', required: true },
    { key: 'phone', label: 'الهاتف', required: true },
    { key: 'request_type', label: 'نوع الطلب', options: [['sale', 'شراء'], ['rental', 'إيجار'], ['general', 'عام']] as const },
    { key: 'property_type', label: 'نوع العقار' },
    { key: 'location', label: 'الموقع' },
    { key: 'budget', label: 'الميزانية', type: 'number' as const },
    { key: 'area', label: 'المساحة', type: 'number' as const },
    { key: 'bedrooms', label: 'غرف النوم', type: 'number' as const },
    { key: 'bathrooms', label: 'الحمامات', type: 'number' as const },
    { key: 'description', label: 'التفاصيل', type: 'textarea' as const },
    { key: 'status', label: 'الحالة', required: true, options: [['new', 'جديد'], ['in_progress', 'قيد المتابعة'], ['completed', 'مكتمل'], ['cancelled', 'ملغي']] as const },
    { key: 'notes', label: 'ملاحظات داخلية', type: 'textarea' as const },
  ],
};

export function RequestManager() { return <ManagedEntityManager config={config} />; }
