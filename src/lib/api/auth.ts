import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export type CurrentUserProfile = {
  role: string
  department: string | null
}

/**
 * Returns the signed-in user's role and department, or null when nobody is
 * signed in.
 */
export async function getCurrentUserProfile(
  client: SupabaseClient = supabase,
): Promise<CurrentUserProfile | null> {
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await client
    .from('profiles')
    .select('role, department')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as CurrentUserProfile
}

/**
 * Returns the signed-in user's role, or null when nobody is signed in.
 */
export async function getCurrentUserRole(
  client: SupabaseClient = supabase,
): Promise<string | null> {
  const profile = await getCurrentUserProfile(client)
  return profile?.role ?? null
}
