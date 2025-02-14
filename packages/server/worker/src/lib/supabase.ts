import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes/shared'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key for admin access
)

// Used for:
// - Updating job progress
// - Storing transcripts
// - Updating summary content