import { createClient } from '@supabase/supabase-js'

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
