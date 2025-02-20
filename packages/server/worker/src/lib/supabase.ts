import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes-new/shared'
import { config } from '../config/environment'

export const supabase = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY
)

// Used for:
// - Updating job progress
// - Storing transcripts
// - Updating summary content