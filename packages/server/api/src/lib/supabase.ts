// packages/server/api/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes-new/shared'
import { config } from '../config/environment'

// IMPORTANT: Override the internal Redis hostname in environment variables
// This is needed because Supabase's connection pooling might use Redis internally
// and it would try to use the internal hostname (redis.railway.internal)
if (process.env.REDIS_URL && process.env.REDIS_URL.includes('redis.railway.internal')) {
  // Fix for Supabase connection pooling in Railway environment
  console.log('Sanitizing Redis environment variables for Supabase client');
  
  // Extract the public hostname/port from environment if available
  let publicHost = 'roundhouse.proxy.rlwy.net';
  let publicPort = process.env.REDIS_PUBLIC_PORT ? parseInt(process.env.REDIS_PUBLIC_PORT, 10) : 30105;
  
  if (process.env.REDISHOST === 'redis.railway.internal') {
    process.env.REDISHOST = publicHost;
    console.log(`Overriding REDISHOST: ${publicHost}`);
  }
  
  if (process.env.REDIS_HOST === 'redis.railway.internal') {
    process.env.REDIS_HOST = publicHost;
    console.log(`Overriding REDIS_HOST: ${publicHost}`);
  }
  
  if (process.env.REDISPORT) {
    process.env.REDISPORT = publicPort.toString();
    console.log(`Overriding REDISPORT: ${publicPort}`);
  }
  
  if (process.env.REDIS_PORT) {
    process.env.REDIS_PORT = publicPort.toString();
    console.log(`Overriding REDIS_PORT: ${publicPort}`);
  }
}

// Create supabase client with sanitized environment variables
export const supabase = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    },
    // Add additional Supabase client options as needed
    // Reference: https://github.com/supabase/supabase-js#client-options
  }
)