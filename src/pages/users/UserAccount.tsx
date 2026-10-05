import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Profile = {
  first_name: string
  last_name: string
  middle_initial: string | null
  address: string
  phone: string
}

function UserAccounts() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/'
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, middle_initial, address, phone')
        .eq('id', user.id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    getProfile()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    window.location.href = '/'
  }

  if (loading) {
    return <p>Loading account...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  if (!profile) {
    return <p>Profile not found.</p>
  }

  return (
    <div>
      <h1>My Account</h1>

      <p>
        <strong>Name:</strong>{' '}
        {profile.first_name} {profile.middle_initial} {profile.last_name}
      </p>

      <p>
        <strong>Address:</strong> {profile.address}
      </p>

      <p>
        <strong>Phone:</strong> {profile.phone}
      </p>

      <br />

      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}

export default UserAccounts

