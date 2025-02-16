import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3001'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  REDIS_URL: z.string().url(),
  YOUTUBE_API_KEY: z.string(),
  SPOTIFY_ACCESS_TOKEN: z.string(),
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