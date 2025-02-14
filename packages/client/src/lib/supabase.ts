import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes/shared'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Used for:
// - Authentication
// - Real-time subscriptions
// - Public data access