// packages/server/api/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes-new/shared'
import { config } from '../config/environment'

// Create Supabase client
export const supabase = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)