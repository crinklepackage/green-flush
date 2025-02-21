// packages/server/api/src/config/environment.ts
import { z } from 'zod'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({
  path: path.resolve(__dirname, '../../.env.local')
})

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  REDIS_URL: z.string().url(),
  YOUTUBE_API_KEY: z.string(),
  SPOTIFY_CLIENT_ID: z.string(),
  SPOTIFY_CLIENT_SECRET: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  NODE_ENV: z.enum(['development', 'production']).default('development')
})

// Parse and export environment
export const config = envSchema.parse(process.env)
