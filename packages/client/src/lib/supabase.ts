import { createClient } from '@supabase/supabase-js'
import { Database } from '@wavenotes-new/shared'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) {
throw new Error('Missing SUPABASE env variables');
}
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
// Helper function for signing up a new user
export async function signUp(email: string, password: string) {
const { data, error } = await supabase.auth.signUp({ email, password });
return { data, error };
}
// Helper function for signing in an existing user using Supabase v2 API
export async function signIn(email: string, password: string) {
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
return { data, error };
}
// Helper function for signing out
export async function signOut() {
const { error } = await supabase.auth.signOut();
return { error };
}
// Helper function to get the current session (v2 API returns a promise)
export async function getSession() {
const { data, error } = await supabase.auth.getSession();
return data.session;
}
// Helper function to get the current user (v2 API)
export async function getUser() {
const { data, error } = await supabase.auth.getUser();
return data.user || null;
}