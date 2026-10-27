import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Neither member data nor sessions are persisted in browser storage.
// Reloading the page requires signing in again.
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true },
}) : null
