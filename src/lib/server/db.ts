import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { VITE_SUPABASE_URL } from '$env/static/public';

/**
 * Server-side Supabase client with service role privileges.
 * Use this in API routes and server load functions only.
 */
export const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
