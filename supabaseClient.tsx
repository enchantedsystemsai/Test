// supabaseClient.tsx
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Your Supabase project details
const supabaseUrl = 'https://lnzvmpfqrwpcuebcrnat.supabase.co';
const supabaseAnonKey = 'sb_publishable_eGCDIcoCUGtVhcJxySnpGA_e5yI-d4c';

// Create a single, shared Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Freeze to prevent accidental mutation
Object.freeze(supabase);
