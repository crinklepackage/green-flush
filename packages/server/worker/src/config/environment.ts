// packages/server/worker/src/config/environment.ts
import { z } from 'zod'

const envSchema = z.object({
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
  NODE_ENV: z.enum(['development', 'production']).default('development')
})

export const validateEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment variables:', error.errors)
    process.exit(1)
  }
}

export const env = validateEnv()