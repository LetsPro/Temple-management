import { createClient } from '@supabase/supabase-js'

<<<<<<< HEAD
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
=======
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
>>>>>>> 4a4b974a0a3903bc7466c22ee6f46e06f8b3dbc7
