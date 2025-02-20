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
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  
  // Optional
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  
  // Anthropic
  ANTHROPIC_API_KEY: z.string()
})

export const config = {
  REDIS_URL: process.env.REDIS_URL!,
  YOUTUBE_OAUTH_CLIENT_ID: process.env.YOUTUBE_OAUTH_CLIENT_ID!,
  YOUTUBE_OAUTH_CLIENT_SECRET: process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
  YOUTUBE_OAUTH_REFRESH_TOKEN: process.env.YOUTUBE_OAUTH_REFRESH_TOKEN!,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY!,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  NODE_ENV: process.env.NODE_ENV as 'development' | 'production',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!
}