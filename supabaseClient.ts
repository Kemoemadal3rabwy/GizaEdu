
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// هام جداً: تم ربط المفاتيح الخاصة بمشروعك
// IMPORTANT: Your Supabase Keys are now connected
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://rxlqsyjtylvbbxavhzhm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Y9KgUtDabFqxKvuqUhz2gQ_JJJ6lkNS';

// Check if keys are configured
const isConfigured = SUPABASE_URL.startsWith('https') && SUPABASE_ANON_KEY.length > 0;

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

export const isSupabaseEnabled = () => isConfigured;
