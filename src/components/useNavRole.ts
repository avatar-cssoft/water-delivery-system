import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '../lib/api/auth'
import { supabase } from '../lib/supabase'

type NavRole = 'checking' | 'guest' | 'customer' | 'employee' | 'admin' | 'signed-in'

type NavIdentity = {
  role: NavRole
  department: string | null
}

function toNavRole(role: string | null): NavRole {
  if (role === null) return 'guest'
  if (role === 'admin') return 'admin'
  if (role === 'employee' || role === 'rider') return 'employee'
  if (role === 'user' || role === 'customer') return 'customer'
  return 'signed-in'
}

export function useNavRole() {
  const [identity, setIdentity] = useState<NavIdentity>({
    role: 'checking',
    department: null,
  })

  useEffect(() => {
    let cancelled = false
    let latestRequest = 0

    const loadRole = () => {
      const request = ++latestRequest

      getCurrentUserProfile()
        .then((profile) => {
          if (!cancelled && request === latestRequest) {
            setIdentity({
              role: toNavRole(profile?.role ?? null),
              department: profile?.department ?? null,
            })
          }
        })
        .catch(() => {
          if (!cancelled && request === latestRequest) {
            setIdentity({ role: 'signed-in', department: null })
          }
        })
    }

    loadRole()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Defer the role lookup until Supabase finishes its auth callback.
        setTimeout(loadRole, 0)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return identity
}
