import { useEffect, useState } from 'react'
import { getCurrentUserRole } from '../lib/api/auth'
import { supabase } from '../lib/supabase'

type NavRole = 'checking' | 'guest' | 'customer' | 'employee' | 'admin' | 'signed-in'

function toNavRole(role: string | null): NavRole {
  if (role === null) return 'guest'
  if (role === 'admin') return 'admin'
  if (role === 'employee' || role === 'rider') return 'employee'
  if (role === 'user' || role === 'customer') return 'customer'
  return 'signed-in'
}

export function useNavRole() {
  const [role, setRole] = useState<NavRole>('checking')

  useEffect(() => {
    let cancelled = false
    let latestRequest = 0

    const loadRole = () => {
      const request = ++latestRequest

      getCurrentUserRole()
        .then((userRole) => {
          if (!cancelled && request === latestRequest) setRole(toNavRole(userRole))
        })
        .catch(() => {
          if (!cancelled && request === latestRequest) setRole('signed-in')
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

  return role
}
