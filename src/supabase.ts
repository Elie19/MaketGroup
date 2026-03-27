import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../supabase-config.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || supabaseConfig.supabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseConfig.supabaseAnonKey;

if (supabaseUrl === 'https://lnnumdpnxmcszcuzadcv.supabase.co' || supabaseAnonKey === '002001') {
  console.warn('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
