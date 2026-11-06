import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function AddressLogbook() {
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      try {
        const { data: { user }, error: sessionError } = await supabase.auth.getUser()
        if (cancelled) return

        if (sessionError) setError('Could not verify your session. Please try again.')
        else setSignedIn(Boolean(user))
      } catch {
        if (!cancelled) {
          setError('Could not verify your session. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void checkSession()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p>Checking your account...</p>

  if (error) {
    return (
      <section>
        <h1>Address Logbook</h1>
        <p role="alert">{error}</p>
      </section>
    )
  }

  if (!signedIn) {
    return (
      <section>
        <h1>Address Logbook</h1>
        <p>You must sign in to access the Address Logbook.</p>
        <Link to="/login">Sign in</Link>
      </section>
    )
  }

  return (
    <div>
      <h1>Address Logbook</h1>
      <p>Saved addresses will be available here in a future update.</p>
      <Link to="/account">Back to My Account</Link>
    </div>
  )
}

export default AddressLogbook
