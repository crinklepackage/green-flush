import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config/environment'

declare global {
  namespace Express {
    interface Request {
      user: { id: string }
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })
  
  req.user = { id: user.id }
  try {
    // simulate awaiting some async operation
    await new Promise(resolve => setTimeout(resolve, 10))
    next()
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' })
  }
} 