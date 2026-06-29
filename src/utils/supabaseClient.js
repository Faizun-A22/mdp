import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inisialisasi client Supabase jika environment variables terkonfigurasi.
// Jika tidak terkonfigurasi, variable 'supabase' akan bernilai null dan sistem 
// secara dinamis akan melakukan fallback ke Local Storage.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
