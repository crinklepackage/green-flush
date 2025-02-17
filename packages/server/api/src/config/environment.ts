import { z } from 'zod'

export const envSchema = z.object({
  PORT: z.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  REDIS_URL: z.string().url(),
  YOUTUBE_API_KEY: z.string(),
  SPOTIFY_ACCESS_TOKEN: z.string(),
  NODE_ENV: z.enum(['development', 'production']).default('development')
})

// Parse and export environment
export const env = envSchema.parse(process.env)