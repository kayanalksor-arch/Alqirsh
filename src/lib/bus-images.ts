import type { SupabaseClient } from '@supabase/supabase-js';

export function busImageUrl(db:SupabaseClient,path:string|null|undefined) {
  return path ? db.storage.from('bus-images').getPublicUrl(path).data.publicUrl : '/brand/alqirsh-logo.png';
}
