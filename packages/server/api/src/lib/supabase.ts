// packages/server/api/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes/shared'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)