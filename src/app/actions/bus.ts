'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cairoLocalDateTime } from '@/lib/bus-time';

async function authorize(permission: string) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Sign in to continue.');
  const { data, error } = await db.rpc('has_section_permission', { permission_name: permission });
  if (error || !data) {
    await db.rpc('record_denied_admin_access', { p_path: '/dashboard/trips' });
    throw new Error('You do not have permission to perform this action.');
  }
  return { db, user };
}

function text(data: FormData, key: string, max: number) {
  const value = data.get(key);
  if (typeof value !== 'string') throw new Error(`Missing ${key}.`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new Error(`Invalid ${key}.`);
  return clean;
}

export async function createBus(data: FormData) {
  const { db } = await authorize('bus.fleet.manage');
  const name = text(data, 'name', 120);
  const busNumber = text(data, 'bus_number', 40);
  const busType = text(data, 'bus_type', 60);
  const capacity = Number(data.get('capacity'));
  if (!Number.isInteger(capacity) || capacity < 4 || capacity > 100) throw new Error('Capacity must be between 4 and 100 seats.');
  const services = String(data.get('services') ?? '').split(/[,\n]/u).map((item) => item.trim()).filter(Boolean).slice(0, 15);
  const { error } = await db.rpc('create_bus_with_seats', {
    p_name: name, p_bus_number: busNumber, p_plate_number: String(data.get('plate_number') ?? '').trim(),
    p_bus_type: busType, p_manufacturer: String(data.get('manufacturer') ?? '').trim(),
    p_model: String(data.get('model') ?? '').trim(), p_capacity: capacity, p_services: services,
    p_image_path: String(data.get('image_path') ?? '').trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips');
  revalidatePath('/trips');
}


async function uploadBusPhoto(db:Awaited<ReturnType<typeof createClient>>,userId:string,file:File){
  if(!(file instanceof File)||file.size<1||file.size>12*1024*1024)throw new Error('Photo must be a valid image up to 12 MB.');
  const sharp=(await import('sharp')).default;const source=Buffer.from(await file.arrayBuffer());
  const image=sharp(source,{limitInputPixels:40_000_000,failOn:'error'});const metadata=await image.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format??''))throw new Error('Only JPG, PNG, and WEBP images are allowed.');
  const optimized=await image.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:5}).toBuffer();
  if(optimized.byteLength>5*1024*1024)throw new Error('Compressed photo exceeds 5 MB. Choose a smaller image.');
  const path=`${userId}/${crypto.randomUUID()}/${crypto.randomUUID()}.webp`;
  const{error}=await db.storage.from('bus-images').upload(path,optimized,{contentType:'image/webp',upsert:false});if(error)throw new Error(error.message);return path;
}
export async function saveBusWithImage(data:FormData,imageFile:File|null):Promise<{ok:true}|{ok:false;error:string}> {
  let db:Awaited<ReturnType<typeof createClient>>|null=null;let path:string|null=null;
  try{const auth=await authorize('bus.fleet.manage');db=auth.db;if(imageFile)path=await uploadBusPhoto(db,auth.user.id,imageFile);const fields=new FormData();data.forEach((value,key)=>fields.set(key,value));fields.set('image_path',path??'');await createBus(fields);return{ok:true};}
  catch(error){if(db&&path)await db.storage.from('bus-images').remove([path]);return{ok:false,error:error instanceof Error?error.message:'Could not save the bus.'};}
}
export async function saveBusImage(busId:string,imageFile:File|null,remove:boolean):Promise<{ok:true}|{ok:false;error:string}> {
  let db:Awaited<ReturnType<typeof createClient>>|null=null;let next:string|null=null;
  try{const auth=await authorize('bus.fleet.manage');db=auth.db;const{data:bus,error:readError}=await db.from('buses').select('image_path').eq('id',busId).maybeSingle();if(readError||!bus)throw new Error('Bus not found.');if(imageFile)next=await uploadBusPhoto(db,auth.user.id,imageFile);else if(!remove)return{ok:true};const{error}=await db.rpc('update_bus_image',{p_bus_id:busId,p_image_path:next});if(error)throw new Error(error.message);if(bus.image_path&&bus.image_path!==next)await db.storage.from('bus-images').remove([bus.image_path]);revalidatePath('/dashboard/trips');revalidatePath('/trips');return{ok:true};}
  catch(error){if(db&&next)await db.storage.from('bus-images').remove([next]);return{ok:false,error:error instanceof Error?error.message:'Could not update bus photo.'};}
}
export async function createBusTrip(data: FormData) {
  const { db, user } = await authorize('bus.trips.manage');
  const busId = text(data, 'bus_id', 36);
  const origin = text(data, 'origin', 120);
  const destination = text(data, 'destination', 120);
  const departureValue = text(data, 'departure_at', 30);
  const price = Number(data.get('price'));
  const { data: bus, error: busError } = await db.from('buses').select('id,name,bus_type,services,status,image_path').eq('id', busId).eq('status', 'active').maybeSingle();
  if (busError || !bus) throw new Error('Choose an active bus.');
  const { count } = await db.from('bus_seats').select('id', { count: 'exact', head: true }).eq('bus_id', busId).neq('seat_type', 'unavailable');
  if (!count || count < 1) throw new Error('The bus needs at least one available seat.');
  const date = cairoLocalDateTime(departureValue);
  if (!date || date <= new Date()) throw new Error('Departure must be in the future.');
  const arrivalValue = String(data.get('arrival_at') ?? '').trim();
  const arrival = arrivalValue ? cairoLocalDateTime(arrivalValue) : null;
  if (arrivalValue && (!arrival || arrival <= date)) throw new Error('Arrival must be after departure.');
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw new Error('Enter a valid ticket price.');
  const status = data.get('status') === 'published' ? 'published' : 'draft';
  const tripCode = `AQ-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
  const { error } = await db.from('bus_trips').insert({
    bus_id: busId, bus_name: bus.name, bus_type: bus.bus_type, origin, destination,
    departure_at: date.toISOString(), arrival_at: arrival?.toISOString() ?? null, price,
    capacity: count, services: bus.services ?? [], bus_image_path:bus.image_path, instructions: String(data.get('instructions') ?? '').trim() || null,
    status, trip_code: tripCode, created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips');
  revalidatePath('/trips');
}

export async function confirmBusBooking(bookingId: string) {
  const { db } = await authorize('bus.bookings.manage');
  const { error } = await db.rpc('confirm_bus_booking', { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips');
}

export async function issueBusTickets(bookingId: string) {
  const { db } = await authorize('bus.tickets.issue');
  const { error } = await db.rpc('issue_bus_tickets', { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips');
}

export async function rejectBusBooking(bookingId: string) {
  const { db } = await authorize('bus.bookings.manage');
  const { error } = await db.rpc('release_bus_booking', { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips');
}

export async function reviewBusReceipt(receiptId: string, accept: boolean, reason = '') {
  const { db } = await authorize('bus.receipts.review');
  const { error } = accept
    ? await db.rpc('confirm_bus_transfer', { p_receipt_id: receiptId })
    : await db.rpc('reject_bus_receipt', { p_receipt_id: receiptId, p_reason: reason.slice(0, 500) });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips');
}

async function validateBusReceipt(file: FormDataEntryValue | null): Promise<File> {
  if (!(file instanceof File) || file.size < 1 || file.size > 8 * 1024 * 1024) throw new Error('Choose an image or PDF up to 8 MB.');
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  if (!allowed.has(file.type)) throw new Error('Only JPG, PNG, WEBP, and PDF receipts are allowed.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const magic = file.type === 'image/png' ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    : file.type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.type === 'image/webp' ? String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
        : String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (!magic) throw new Error('The file content does not match its declared type.');
  return file;
}

async function storeBusReceipt(db: Awaited<ReturnType<typeof createClient>>, userId: string, bookingId: string, file: File, reference: string) {
  const { data: booking, error: bookingError } = await db.from('bus_bookings').select('id,payment_method,status').eq('id', bookingId).eq('customer_id', userId).maybeSingle();
  if (bookingError || !booking || booking.status !== 'pending' || booking.payment_method !== 'bank_transfer') throw new Error('This booking cannot accept a receipt.');
  const path = `${userId}/${booking.id}/${crypto.randomUUID()}`;
  const { error: uploadError } = await db.storage.from('bus-payment-receipts').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await db.rpc('upload_bus_payment_receipt', {
    p_booking_id: booking.id, p_storage_path: path, p_mime_type: file.type,
    p_file_size: file.size, p_reference: reference.slice(0, 120), p_transferred_at: null,
  });
  if (error) {
    await db.storage.from('bus-payment-receipts').remove([path]);
    throw new Error(error.message);
  }
}

export type BusBookingActionState = { error: 'booking_failed' | null };

export async function createBusBooking(_previousState: BusBookingActionState, data: FormData): Promise<BusBookingActionState> {
  let redirectTo: string | null = null;
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to book a trip.');
    const tripId = text(data, 'trip_id', 36);
    const seatIds = data.getAll('seat_ids').filter((value): value is string => typeof value === 'string');
    const passengerNames = data.getAll('passenger_names').filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean);
    if (seatIds.length < 1 || seatIds.length > 8 || new Set(seatIds).size !== seatIds.length) throw new Error('Choose between one and eight distinct seats.');
    if (passengerNames.length !== seatIds.length || passengerNames.some((name) => name.length < 2 || name.length > 120)) throw new Error('Enter one passenger name for every selected seat.');
    const paymentMethod = data.get('payment_method');
    if (paymentMethod !== 'bank_transfer' && paymentMethod !== 'cash_on_boarding') throw new Error('Choose a payment method.');
    const receipt = paymentMethod === 'bank_transfer' ? await validateBusReceipt(data.get('receipt')) : null;
    const { data: booking, error } = await db.rpc('create_bus_booking', {
      p_trip_id: tripId, p_seat_ids: seatIds, p_customer_name: text(data, 'customer_name', 120),
      p_customer_phone: text(data, 'customer_phone', 30), p_customer_email: user.email ?? null,
      p_passenger_names: passengerNames, p_payment_method: paymentMethod,
    });
    if (error || !booking?.length) throw new Error(error?.message ?? 'Could not create the booking.');
    const bookingCode = booking[0].booking_code as string;
    if (receipt) {
      try {
        await storeBusReceipt(db, user.id, booking[0].booking_id, receipt, String(data.get('transfer_reference') ?? ''));
      } catch (error) {
        console.error(`Bus receipt upload after booking failed: ${error instanceof Error ? error.message : String(error)}`);
        redirectTo = `/trips/bookings/${bookingCode}?receipt=failed`;
      }
    }
    revalidatePath('/trips');
    redirectTo ??= `/trips/bookings/${bookingCode}`;
  } catch (error) {
    console.error(`Bus booking creation failed: ${error instanceof Error ? error.message : String(error)}`);
    return { error: 'booking_failed' };
  }
  if (redirectTo) redirect(redirectTo);
  return { error: null };
}

export async function uploadBusReceipt(data: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Sign in to upload a transfer receipt.');
  const bookingId = text(data, 'booking_id', 36);
  const file = await validateBusReceipt(data.get('receipt'));
  await storeBusReceipt(db, user.id, bookingId, file, String(data.get('transfer_reference') ?? ''));
  revalidatePath(`/trips/bookings/${String(data.get('booking_code') ?? '')}`);
}

export type BusScanState = { message: string; result?: string; bookingCode?: string; passenger?: string; seat?: string; trip?: string; payment?: string;ticketId?:string;tripId?:string;bus?:string;departure?:string;boardedAt?:string;employee?:string;employeeId?:string;boardedCount?:number;remainingCount?:number;recent?:{ticketId:string;result:string;passenger:string;seat:string;time:string}[] };
export async function scanBusTicket(_previous: BusScanState, data: FormData): Promise<BusScanState> {
  const { db,user } = await authorize('bus.qr.scan');
  const token=String(data.get('qr_token')??'').trim();const ticketNumber=String(data.get('ticket_number')??'').trim();const expectedTrip=String(data.get('trip_id')??'').trim()||null;
  if((!token&&!ticketNumber)||(token&&ticketNumber))return{message:'Enter one QR token or ticket number.',result:'invalid'};
  if(ticketNumber&&!/^[0-9a-f-]{36}$/iu.test(ticketNumber))return{message:'Invalid ticket number.',result:'invalid'};
  const { data: result, error } = await db.rpc('scan_and_board_bus_ticket', { p_qr_token: token||null,p_expected_trip_id:expectedTrip,p_ticket_id:ticketNumber||null });
  if (error) return { message: 'Could not verify with the server. Do not allow boarding.',result:'offline' };
  const row = result?.[0]; if (!row) return { message: 'No ticket result returned.',result:'invalid' };
  const trip = [row.trip_origin,row.trip_destination].filter(Boolean).join(' → ');
  const descriptions:Record<string,string>={valid:'Ticket accepted. Boarding permitted and recorded.',already_boarded:'Ticket already used.',payment_due:'Payment requirements are not met.',invalid:'Ticket or QR code was not found.',wrong_trip:'Ticket is for a different trip.',cancelled:'Ticket was cancelled.',refunded:'Ticket was refunded.',unapproved:'Booking is not approved.'};
  const tripId=expectedTrip;
  let stats=null;try{if(tripId){const summary=await db.rpc('get_bus_trip_boarding_stats',{p_trip_id:tripId});if(!summary.error)stats=summary.data;}}catch{/* The atomic scan RPC already committed the boarding. */}
  const stat=stats?.[0];
  const recent=(stat?.recent_scans??[]).map((item:{ticket_id:string;result:string;at:string;passenger?:string|null;seat?:string|null})=>({ticketId:item.ticket_id??'',result:item.result,passenger:item.passenger??'',seat:item.seat??'',time:item.at}));
  const employee=String(user.user_metadata?.full_name??user.user_metadata?.name??user.email??'');
  return {message:descriptions[row.result]??'Ticket rejected.',result:row.result,bookingCode:row.booking_code??undefined,passenger:row.passenger_name??undefined,seat:row.seat_label??undefined,trip,payment:row.payment_status??undefined,ticketId:row.ticket_id??undefined,tripId:tripId??undefined,bus:row.bus_name??undefined,departure:row.departure_at??undefined,boardedAt:row.boarded_at??undefined,employee:row.boarded_by_name??(row.result==='valid'?employee:undefined),employeeId:row.result==='valid'?user.id:undefined,boardedCount:stat?.boarded_count??0,remainingCount:stat?.remaining_count??0,recent};
}
export async function collectBusCashByCode(data: FormData) {
  const { db } = await authorize('bus.cash.collect');
  const code = text(data, 'booking_code', 20);
  const { data: booking, error: lookupError } = await db.from('bus_bookings').select('id,total_amount').eq('booking_code', code).maybeSingle();
  if (lookupError || !booking) throw new Error('Booking not found.');
  const { error } = await db.rpc('collect_bus_cash', { p_booking_id: booking.id, p_amount: booking.total_amount });
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard/trips/scan');
}
