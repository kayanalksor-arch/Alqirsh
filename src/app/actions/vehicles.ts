'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const permissionField: Record<string, string> = {
  view: 'can_view_vehicles', add: 'can_add_vehicles', edit: 'can_edit_vehicles',
  delete: 'can_delete_vehicles', images: 'can_manage_images',
  booking_create: 'can_create_bookings', booking_view: 'can_view_bookings',
  booking_edit: 'can_edit_bookings', booking_cancel: 'can_cancel_bookings',
  customer_details: 'can_view_customer_details',
};

async function authorized(permission: keyof typeof permissionField, type: 'rent'|'sale' = 'rent') {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('يرجى تسجيل الدخول.');
  const { data: profile } = await db.from('profiles').select('role,status').eq('id', user.id).single();
  if (profile?.status !== 'active') throw new Error('الحساب غير نشط.');
  if (profile?.role !== 'admin') {
    const { data: perms } = await db.from('section_permissions').select('*').eq('user_id', user.id).maybeSingle();
    const base:Record<string,string>={view:'cars_rent_view',add:'cars_rent_create',edit:'cars_rent_update',delete:'cars_rent_delete',images:'cars_images_manage',booking_create:'bookings_create',booking_view:'bookings_view',booking_edit:'bookings_update',booking_cancel:'bookings_cancel'};
    const key=type==='sale'?base[permission]?.replace('_rent_','_sale_'):base[permission];
    let allowed=Boolean(perms?.[key as keyof typeof perms]);
    if(!perms){const {data:legacy}=await db.from('vehicle_permissions').select('*').eq('user_id',user.id).maybeSingle();allowed=Boolean(legacy?.[permissionField[permission] as keyof typeof legacy]&&legacy?.[type==='rent'?'can_access_rent':'can_access_sale']);}
    if(!allowed){await db.rpc('record_denied_admin_access',{p_path:'/dashboard/cars'});throw new Error('\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u0635\u0644\u0627\u062d\u064a\u0629 \u0644\u062a\u0646\u0641\u064a\u0630 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064a\u0629.');}
  }  return { db, user };
}

export async function saveVehicle(input: Record<string, unknown>, id: string | null, imagePaths: string[], removeImageIds: string[] = []) {
  const type = input.listing_type === 'sale' ? 'sale' : 'rent';
  const { db, user } = await authorized(id ? 'edit' : 'add', type);
  if (imagePaths.length || removeImageIds.length) await authorized('images', type);
  const { data: previousVehicle } = id
    ? await db.from('vehicle_listings').select('image_url').eq('id', id).maybeSingle()
    : { data: null };
  const fields={...input}; delete fields.image_url;
  const payload = { ...fields, ...(imagePaths[0] ? { image_url: db.storage.from('listing-images').getPublicUrl(imagePaths[0]).data.publicUrl } : {}), ...(id ? {} : { created_by: user.id }) };
  const result = id
    ? await db.from('vehicle_listings').update(payload).eq('id', id).select('id').maybeSingle()
    : await db.from('vehicle_listings').insert(payload).select('id').single();
  if (result.error || !result.data) {
    console.error('تعذر حفظ السيارة.', result.error);
    throw new Error('تعذر حفظ السيارة. يُرجى مراجعة البيانات والمحاولة مرة أخرى.');
  }
  const vehicleId = result.data.id;
  let removedImageUrls: string[] = [];
  if (removeImageIds.length) {
    const { data: removed, error } = await db.from('vehicle_images').delete().eq('vehicle_id', vehicleId).in('id', removeImageIds).select('storage_path,public_url');
    if (error) throw new Error(error.message);
    removedImageUrls = (removed ?? []).map((row) => row.public_url);
    if (removed?.length) { const { error: storageError } = await db.storage.from('listing-images').remove(removed.map((row) => row.storage_path)); if (storageError) throw new Error(storageError.message); }
  }
  const { data: existingGallery, error: existingGalleryError } = await db.from('vehicle_images')
    .select('sort_order').eq('vehicle_id', vehicleId).order('sort_order', { ascending: false }).limit(1);
  if (existingGalleryError) throw new Error(existingGalleryError.message);
  const nextSortOrder = (existingGallery?.[0]?.sort_order ?? -1) + 1;
  for (const [index, path] of imagePaths.entries()) {
    const url = db.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
    const { error } = await db.from('vehicle_images').insert({ vehicle_id: vehicleId, storage_path: path, public_url: url, sort_order: nextSortOrder + index, is_primary: nextSortOrder + index === 0 });
    if (error) {
      await db.storage.from('listing-images').remove(imagePaths);
      throw new Error(error.message);
    }
  }
  if (imagePaths.length || removeImageIds.length) {
    const { data: gallery, error: galleryError } = await db.from('vehicle_images')
      .select('id,public_url,is_primary,sort_order').eq('vehicle_id', vehicleId).order('sort_order');
    if (galleryError) throw new Error(galleryError.message);
    const primary = gallery?.find((image) => image.is_primary) ?? gallery?.[0] ?? null;
    if (gallery?.length && primary) {
      const { error: resetError } = await db.from('vehicle_images').update({ is_primary: false }).eq('vehicle_id', vehicleId);
      if (resetError) throw new Error(resetError.message);
      const { error: primaryError } = await db.from('vehicle_images').update({ is_primary: true }).eq('id', primary.id).eq('vehicle_id', vehicleId);
      if (primaryError) throw new Error(primaryError.message);
    }
    if (primary || removedImageUrls.includes(previousVehicle?.image_url ?? '')) {
      const { error: urlError } = await db.from('vehicle_listings').update({ image_url: primary?.public_url ?? null }).eq('id', vehicleId);
      if (urlError) throw new Error(urlError.message);
    }
  }
  revalidatePath('/dashboard/cars'); revalidatePath('/cars');
  return vehicleId;
}

export async function deleteVehicle(id: string) {
  const client=await createClient();const {data:vehicle,error:lookupError}=await client.from('vehicle_listings').select('listing_type').eq('id',id).single();if(lookupError||!vehicle)throw new Error('السيارة غير موجودة أو لا تملك صلاحية الوصول إليها.');
  const { db } = await authorized('delete',vehicle.listing_type==='sale'?'sale':'rent');
  const { error } = await db.from('vehicle_listings').update({ status: 'archived' }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/cars'); revalidatePath('/cars');
}

export async function removeVehicleImage(vehicleId: string, imageId: string) {
  const { db } = await authorized('images');
  const { data, error } = await db.from('vehicle_images').delete().eq('id', imageId).eq('vehicle_id', vehicleId).select('storage_path').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('الصورة غير موجودة أو لا تملك صلاحية تعديلها.');
  const { error: removeError } = await db.storage.from('listing-images').remove([data.storage_path]);
  if (removeError) throw new Error(removeError.message);
  revalidatePath('/cars');
}

export async function getVehicleImages(vehicleId: string, type: 'rent'|'sale' = 'rent') {
  const { db } = await authorized('edit', type);
  const { data, error } = await db.from('vehicle_images').select('id,storage_path,public_url,is_primary,sort_order').eq('vehicle_id', vehicleId).order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function createVehicleBooking(input: { vehicleId: string; customerName: string; customerPhone: string; startsAt: string; endsAt: string; deposit: number; notes: string }) {
  const { db } = await authorized('booking_create');
  const { data, error } = await db.rpc('create_vehicle_booking', { p_vehicle_id: input.vehicleId, p_customer_name: input.customerName, p_customer_phone: input.customerPhone, p_starts_at: input.startsAt, p_ends_at: input.endsAt, p_deposit: input.deposit, p_notes: input.notes });
  if (error) {
    if (error.code === '23P01') throw new Error('السيارة محجوزة في الفترة المحددة.');
    if (error.message.includes('NOT_AUTHORIZED')) throw new Error('ليست لديك صلاحية إنشاء الحجوزات.');
    console.error('تعذر إنشاء حجز السيارة.', error);
    throw new Error('تعذر إنشاء الحجز. يُرجى المحاولة مرة أخرى.');
  }
  revalidatePath('/dashboard/cars'); revalidatePath('/cars');
  return data;
}

export async function listVehicleBookings() {
  const { db } = await authorized('booking_view');
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = await db.from('profiles').select('role').eq('id',user?.id ?? '').maybeSingle();
  const { data: permissions } = await db.from('section_permissions').select('bookings_customer_details').eq('user_id',user?.id ?? '').maybeSingle();
  const fields = profile?.role === 'admin' || permissions?.bookings_customer_details ? 'id,vehicle_id,customer_name,customer_phone,starts_at,ends_at,daily_rate,total_amount,deposit_amount,notes,status,created_at,vehicle_listings(title,brand,model)' : 'id,vehicle_id,starts_at,ends_at,daily_rate,total_amount,status,created_at,vehicle_listings(title,brand,model)';
  const { data, error } = await db.from('vehicle_bookings').select(fields).order('starts_at').limit(200);
  if (error) throw new Error(error.message);
  return data;
}

export async function setVehicleBookingStatus(id: string, status: 'cancelled'|'completed') {
  const { db, user } = await authorized(status === 'cancelled' ? 'booking_cancel' : 'booking_edit');
  const values = status === 'cancelled' ? { status, cancelled_by: user.id, cancelled_at: new Date().toISOString(), updated_by: user.id } : { status, updated_by: user.id };
  const { error } = await db.from('vehicle_bookings').update(values).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/cars');
}

export async function getVehiclePermissionSnapshot() {
  const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user)return null;
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();
  const {data:permissions}=await db.from('section_permissions').select('cars_sale_view,cars_sale_create,cars_sale_update,cars_sale_delete,cars_rent_view,cars_rent_create,cars_rent_update,cars_rent_delete,bookings_view,bookings_create,bookings_cancel').eq('user_id',user.id).maybeSingle();
  const isAdmin=profile?.role==='admin';return {isAdmin,canViewSale:isAdmin||permissions?.cars_sale_view===true,canViewRent:isAdmin||permissions?.cars_rent_view===true,canAddSale:isAdmin||permissions?.cars_sale_create===true,canAddRent:isAdmin||permissions?.cars_rent_create===true,canEditSale:isAdmin||permissions?.cars_sale_update===true,canEditRent:isAdmin||permissions?.cars_rent_update===true,canDeleteSale:isAdmin||permissions?.cars_sale_delete===true,canDeleteRent:isAdmin||permissions?.cars_rent_delete===true,canViewBookings:isAdmin||permissions?.bookings_view===true,canCreateBookings:isAdmin||permissions?.bookings_create===true,canCancel:isAdmin||permissions?.bookings_cancel===true,canViewCustomerDetails:isAdmin};
}

export async function saveUnifiedPermissions(userId:string,values:Record<string,boolean>){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('يرجى تسجيل الدخول.');
 const {data:profile}=await db.from('profiles').select('role,status').eq('id',user.id).single();if(profile?.role!=='admin'||profile.status!=='active')throw new Error('هذه العملية متاحة للمدير العام فقط.');
 if(!userId||userId===user.id)throw new Error('لا يمكنك تغيير صلاحيات حسابك الحالي.');
 const {data:target,error:targetError}=await db.from('profiles').select('id,email,role').eq('id',userId).maybeSingle();
 if(targetError||!target)throw new Error('المستخدم المطلوب غير موجود.');
 if(target.role==='admin')throw new Error('لا يمكن تعديل صلاحيات حساب مدير النظام الأساسي.');
 const keys=['properties_sale_view','properties_sale_create','properties_sale_update','properties_sale_delete','properties_sale_status','properties_rent_view','properties_rent_create','properties_rent_update','properties_rent_delete','properties_rent_status','properties_images_manage','properties_requests_view','properties_requests_manage','properties_management_view','properties_management_manage','cars_sale_view','cars_sale_create','cars_sale_update','cars_sale_delete','cars_rent_view','cars_rent_create','cars_rent_update','cars_rent_delete','cars_images_manage','bookings_view','bookings_create','bookings_update','bookings_cancel','bookings_customer_details','users_permissions_manage','activity_logs_view','bus_fleet_view','bus_fleet_manage','bus_trips_view','bus_trips_manage','bus_bookings_view','bus_bookings_manage','bus_receipts_review','bus_tickets_issue','bus_qr_scan','bus_boarding_record','bus_cash_collect','bus_finance_view','bus_expenses_manage','bus_refunds_manage','bus_audit_view','bus_reports_export'];
 if(Object.keys(values).some(key=>!keys.includes(key))||keys.some(key=>typeof values[key]!=='boolean'))throw new Error('قائمة الصلاحيات المرسلة غير صالحة؛ أعد تحميل الصفحة وحاول مجدداً.');
 const row=Object.fromEntries(keys.map(key=>[key,values[key]===true]));
 const {error}=await db.from('section_permissions').upsert({user_id:userId,...row,updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:'user_id'});if(error)throw new Error(error.message);
 revalidatePath('/dashboard/users');revalidatePath('/dashboard');revalidatePath('/dashboard/cars');revalidatePath('/dashboard/properties');revalidatePath('/dashboard/requests');revalidatePath('/dashboard/property-management');
}

export type ActivityFilters={search?:string;section?:string;action?:string;outcome?:string;since?:string;until?:string;sensitive?:boolean;page?:number};
export async function getActivityLogs(filters:ActivityFilters={}){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('يرجى تسجيل الدخول.');
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();const {data:permission}=await db.from('section_permissions').select('activity_logs_view').eq('user_id',user.id).maybeSingle();if(profile?.role!=='admin'&&!permission?.activity_logs_view)throw new Error('لا تملك صلاحية الاطلاع على سجل الحركة.');
 const page=Math.max(1,filters.page??1),from=(page-1)*30,to=from+29;
 let q=db.from('activity_logs').select('id,actor_id,actor_name,actor_email,section,action,entity_id,entity_label,description,outcome,sensitive,details,created_at',{count:'exact'}).order('created_at',{ascending:false}).range(from,to);
 if(filters.section)q=q.eq('section',filters.section);if(filters.action)q=q.eq('action',filters.action);if(filters.outcome)q=q.eq('outcome',filters.outcome);if(filters.sensitive)q=q.eq('sensitive',true);if(filters.since)q=q.gte('created_at',filters.since);if(filters.until)q=q.lte('created_at',filters.until);if(filters.search){const term=filters.search.replace(/[%,()]/g,' ').trim().slice(0,100);if(term){const isId=/^[0-9a-f-]{36}$/i.test(term);q=q.or(`actor_name.ilike.%${term}%,actor_email.ilike.%${term}%,entity_label.ilike.%${term}${isId?`,actor_id.eq.${term},entity_id.eq.${term}`:''}`);}}
 const {data,error,count}=await q;if(error){console.error('تعذر تحميل سجلات التطبيق.',error);throw new Error('تعذر تحميل سجل التطبيق. يُرجى المحاولة مرة أخرى.');}
 const {data:summaryRows,error:summaryError}=await db.rpc('activity_log_summary',{p_since:filters.since??null,p_until:filters.until??null});if(summaryError){console.error('تعذر تحميل ملخص سجل التطبيق.',summaryError);throw new Error('تعذر تحميل ملخص سجل التطبيق. يُرجى المحاولة مرة أخرى.');}const summary=summaryRows?.[0];
 return {rows:data??[],total:count??0,page,pages:Math.max(1,Math.ceil((count??0)/30)),summary:{total:Number(summary?.total??0),success:Number(summary?.successful??0),failed:Number(summary?.failed??0),users:Number(summary?.active_users??0),sensitive:Number(summary?.sensitive_count??0)}};
}
