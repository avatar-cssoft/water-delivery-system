import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'

/**
 * Returns the signed-in user's role from public.profiles, or null when nobody is
 * signed in. Only used to decide what to show: the database's RLS policies are
 * what actually stop non-admins from writing.
 */
export async function getCurrentUserRole(
  client: SupabaseClient = supabase,
): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return (data as { role: string }).role
}
