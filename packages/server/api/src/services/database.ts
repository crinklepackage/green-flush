import { SupabaseClient, createClient } from '@supabase/supabase-js'

export class DatabaseService {
  private client: SupabaseClient

  constructor(private url: string, private key: string) {
    this.client = createClient(url, key)
  }
} 