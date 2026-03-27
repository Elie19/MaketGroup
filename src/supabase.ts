import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../supabase-config.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || supabaseConfig.supabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseConfig.supabaseAnonKey;
const PLACEHOLDER_URL = 'https://lnnumdpnxmcszcuzadcv.supabase.co';
const PLACEHOLDER_KEY = 'sb_publishable__mooyPTqAmzKMvP4S1F9iA_rGHcaons';

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl !== PLACEHOLDER_URL &&
  supabaseAnonKey !== PLACEHOLDER_KEY &&
  isValidHttpUrl(supabaseUrl);

if (!isConfigured) {
  console.warn('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
