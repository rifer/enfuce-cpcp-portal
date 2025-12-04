// Supabase client for server-side API calls
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials missing. API endpoints will not work.');
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};
