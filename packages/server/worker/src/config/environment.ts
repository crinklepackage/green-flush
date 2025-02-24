// packages/server/worker/src/config/environment.ts
import { z } from 'zod'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local file
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env.local')
})

const envSchema = z.object({
  // Queue
  REDIS_URL: z.string().url(),
  
  // YouTube API
  YOUTUBE_OAUTH_CLIENT_ID: z.string(),
  YOUTUBE_OAUTH_CLIENT_SECRET: z.string(),
  YOUTUBE_OAUTH_REFRESH_TOKEN: z.string(),
  
  // Spotify API
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  
  // Anthropic
  ANTHROPIC_API_KEY: z.string(),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  
})

// Validate environment variables
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format())
  process.exit(1)
}

export const config = parsed.data