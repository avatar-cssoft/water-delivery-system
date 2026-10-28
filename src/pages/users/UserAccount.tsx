
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LIMITS, normalizeMobile } from '../../lib/validation/register'
import { supabase } from '../../lib/supabase'

type Profile = {
  id: string
  first_name: string
  last_name: string
  middle_initial: string | null
  address: string
  phone: string
  role: string
}
type ProfileForm = Omit<Profile, 'id' | 'role' | 'middle_initial' | 'address'> & {
  middle_initial: string
}

function UserAccounts() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formValues, setFormValues] = useState<ProfileForm | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Load the signed-in user's profile.
  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, middle_initial, address, phone, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError(profileError.message)
      } else {
        setProfile(data as Profile)
      }

      setLoading(false)
    }

    void getProfile()
  }, [])

  // Editing Profile Functions
  const MIDDLE_INITIAL_PATTERN = /^\p{L}{1,2}\.?$/u

  function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('63')) {
    return `+63 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
  }
  if (digits.length === 11 && digits.startsWith('09')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return phone}

  const handleEdit = () => {
    if (!profile) return

    setFormValues({
      first_name: profile.first_name,
      middle_initial: profile.middle_initial ?? '',
      last_name: profile.last_name,
      phone: profile.phone,
    })
    setEditing(true)
    setError('')
    setMessage('')
  }

  const handleCancel = () => {
    setEditing(false)
    setFormValues(null)
    setError('')
    setMessage('')
  }

  // Track edits in the form without saving them yet.
  const handleChange = (field: keyof ProfileForm, value: string) => {
    setFormValues((values) => values ? { ...values, [field]: value } : values)
    setMessage('')
  }

  // Show loading and error states before rendering the profile.
  if (loading) {
    return <p>Loading account...</p>
  }

  if (error && !profile) {
    return <p>Error: {error}</p>
  }

  if (!profile) {
    return <p>Profile not found.</p>
  }

  // Check form changes and format profile values for display.

  const hasChanges =
    formValues !== null &&
    (formValues.first_name !== profile.first_name ||
      formValues.middle_initial !== (profile.middle_initial ?? '') ||
      formValues.last_name !== profile.last_name ||
      formValues.phone !== profile.phone)
  const firstNameIsValid = Boolean(formValues?.first_name.trim())
  const middleInitialIsValid =
    Boolean(formValues?.middle_initial.trim()) &&
    MIDDLE_INITIAL_PATTERN.test(formValues?.middle_initial.trim() ?? '')
  const lastNameIsValid = Boolean(formValues?.last_name.trim())
  const phoneIsValid = Boolean(
    formValues?.phone &&
      formValues.phone.length <= LIMITS.phone.max &&
      normalizeMobile(formValues.phone),
  )

  // Capitalize each name word and keep the middle initial uppercase.
  const formatName = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')


  // Render the account page and its edit/view modes.


  return (
    <div className="account-page">
      <h1>My Account</h1>

      {error && <p role="alert">{error}</p>}
      {message && (
        <p className="profile-save-notice" role="status">
          {message}
        </p>
      )}

      {/* Profile View Mode (before editing) */}
      {!editing && (
        <div className="profile-view-mode">

          <section className="profile-details" aria-label="Profile details">
            <p>
              <strong>First Name:</strong> {formatName(profile.first_name)}
            </p>
            <p>
              <strong>Middle Initial:</strong>{' '}
              {profile.middle_initial
                ? `${profile.middle_initial.charAt(0).toUpperCase()}.`
                : '—'}
            </p>
            <p>
              <strong>Last Name:</strong> {formatName(profile.last_name)}
            </p>
            <p>
              <strong>Primary Address:</strong> {profile.address}
            </p>
            <p>
              <strong>Phone:</strong> {formatPhone(profile.phone)}
            </p>
            <p>
              <strong>Role:</strong>{' '}
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </p>
            <button type="button" onClick={handleEdit}>
              Edit Profile
            </button>
          </section>
        </div>
      )}

      {/*Profile Edit Mode (after pressing edit)*/}
      {editing && formValues && (
        <div className="profile-edit-mode">
          <form
            aria-label="Edit profile"
            onSubmit={(event) => event.preventDefault()}
          >
            <div>
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                type="text"
                value={formValues.first_name}
                onChange={(event) => handleChange('first_name', event.target.value)}
                aria-invalid={!firstNameIsValid}
                required
              />
              {!firstNameIsValid && <p role="alert">First name is required.</p>}
            </div>

            {/* Fail-safe: limit initials to the registration format. */}
            <div>
              <label htmlFor="middle_initial">Middle Initial</label>
              <input
                id="middle_initial"
                type="text"
                maxLength={LIMITS.middleInitial.max}
                placeholder="A, AB, or AB."
                value={formValues.middle_initial}
                onChange={(event) => handleChange('middle_initial', event.target.value)}
                aria-invalid={!middleInitialIsValid}
                required
              />
              {!middleInitialIsValid && (
                <p role="alert">Enter one or two letters for the middle initial.</p>
              )}
            </div>

            <div>
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                type="text"
                value={formValues.last_name}
                onChange={(event) => handleChange('last_name', event.target.value)}
                aria-invalid={!lastNameIsValid}
                required
              />
              {!lastNameIsValid && <p role="alert">Last name is required.</p>}
            </div>

            <div>
              <label htmlFor="phone">Phone</label>
              {/* Fail-safe: cap length, strip letters, then validate PH mobile format. */}
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                maxLength={LIMITS.phone.max}
                value={formValues.phone}
                onChange={(event) =>
                  handleChange(
                    'phone',
                    event.target.value.replace(/[^\d+().\s-]/g, ''),
                  )
                }
                aria-invalid={!phoneIsValid}
                required
              />
              {!phoneIsValid && (
                <p role="alert">Enter a valid PH mobile number, e.g. 0912 345 6789.</p>
              )}
            </div>

            <div>
              <label htmlFor="primary-address">Primary Address</label>
              <input
                id="primary-address"
                className="profile-readonly-address"
                type="text"
                value={profile.address}
                readOnly
                aria-readonly="true"
              />
              <div className="address-input-row">
                {hasChanges ? (
                  <span className="address-logbook-disabled">
                    Save changes to open Address Logbook
                  </span>
                ) : (
                  <Link className="address-logbook-link" to="/account/address-logbook">
                    Manage Addresses
                  </Link>
                )}
              </div>
            </div>
          </form>
          {/* Profile Edit Actions */}
          <div className="profile-edit-actions" aria-label="Profile edit actions">
            <div className="profile-edit-actions-content">
              <button
                type="button"
                className="discard-button"
                onClick={handleCancel}
              >
                Discard
              </button>
              <button
                type="button"
                  disabled={
                    !hasChanges ||
                    !firstNameIsValid ||
                    !middleInitialIsValid ||
                    !lastNameIsValid ||
                    !phoneIsValid
                  }
                  onClick={() => setMessage('Saving changes is not available yet.')}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default UserAccounts
