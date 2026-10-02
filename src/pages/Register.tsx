import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleInitial, setMiddleInitial] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          middle_initial: middleInitial,
          phone: phone,
          address: address,
          role: 'user',
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setMessage('Registration successful! You can now log in.')
    setLoading(false)
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Register</h2>

      <form onSubmit={handleRegister}>

        <div>
          <label>First Name</label>
          <br />
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Last Name</label>
          <br />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Middle Initial</label>
          <br />
          <input
            type="text"
            value={middleInitial}
            onChange={(e) => setMiddleInitial(e.target.value)}
            maxLength={2}
            placeholder=""
          />
        </div>

        <br />

        <div>
          <label>Phone</label>
          <br />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Address</label>
          <br />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        {error && <p>{error}</p>}
        {message && <p>{message}</p>}
      </form>

      <p>
        Already have an account? <a href="/">Login</a>
      </p>
    </div>
  )
}

export default Register
