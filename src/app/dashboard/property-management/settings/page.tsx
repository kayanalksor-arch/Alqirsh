import { PropertyManagementList } from '@/components/property-management-page';
export default function PropertyManagementSettingsPage() { return <PropertyManagementList title="إعدادات إدارة الأملاك" description="الإعدادات الفعلية الخاصة بعمليات إدارة الأملاك." table="property_management_settings" fields={['currency', 'grace_period_days']} />; }
