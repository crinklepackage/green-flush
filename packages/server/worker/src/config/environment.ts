// packages/server/worker/src/config/environment.ts
import { z } from 'zod'

export const envSchema = z.object({
  // Queue
  REDIS_URL: z.string().url(),
  
  // YouTube API
  YOUTUBE_OAUTH_CLIENT_ID: z.string(),
  YOUTUBE_OAUTH_CLIENT_SECRET: z.string(),
  YOUTUBE_OAUTH_REFRESH_TOKEN: z.string(),
  
  // Claude
  CLAUDE_API_KEY: z.string(),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  
  // Optional
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  
  // Anthropic
  ANTHROPIC_API_KEY: z.string()
})

export const env = envSchema.parse(process.env)