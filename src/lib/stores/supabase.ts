import { createBrowserClient } from '@supabase/ssr';
import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Browser-side Supabase client using the anon key.
 * Used for realtime subscriptions and client-side reads.
 */
export const supabase = createBrowserClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
