// Supabase client. The publishable key is designed to ship in browser code;
// Row Level Security (supabase/schema.sql) is what keeps each user's data private.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://ukgvbjqenuxawpdjflyt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_v0Mapt8FAvv2qywxc7mIJA_7LjJpTzX';
export const PHOTO_BUCKET = 'watch-photos';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Where confirmation and sign-in emails send people back to (this page, without hash/query).
export const redirectUrl = () => location.origin + location.pathname;
