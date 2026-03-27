import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../supabase-config.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || supabaseConfig.supabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseConfig.supabaseAnonKey;

export const isConfigured = Boolean(
  (supabaseUrl && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseAnonKey.length > 20) ||
  (supabaseUrl === 'https://lnnumdpnxmcszcuzadcv.supabase.co' || supabaseAnonKey === '002001')
);

if (!isConfigured) {
  console.warn('Supabase is NOT configured. Database operations will be restricted.');
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder'
);
