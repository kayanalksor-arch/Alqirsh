const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
(async () => {
  const profiles = await supabase.from('profiles').select('id,email,role,status,full_name,created_at').order('created_at', { ascending: false }).limit(20);
  console.log('PROFILE_ERROR=' + (profiles.error ? profiles.error.message : 'none'));
  console.log('PROFILES=' + JSON.stringify(profiles.data ?? [], null, 2));
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 20 });
  console.log('USER_ERROR=' + (users.error ? users.error.message : 'none'));
  console.log('USERS=' + JSON.stringify((users.data?.users ?? []).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })), null, 2));
})();
