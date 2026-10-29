
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LIMITS, normalizeMobile, validateName } from '../../lib/validation/register'
import { supabase } from '../../lib/supabase'
import { appPath } from '../../lib/navigation'

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
  const [saving, setSaving] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const isCoolingDown = cooldownSeconds > 0
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const saveLocked = useRef(false)
  const cooldownEndsAt = useRef(0)

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
        window.location.href = appPath('/login')
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

  useEffect(() => {
    if (!isCoolingDown) {
      saveLocked.current = false
      return
    }

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((cooldownEndsAt.current - Date.now()) / 1000),
      )
      setCooldownSeconds(remaining)
      if (remaining === 0) {
        saveLocked.current = false
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isCoolingDown])

  // Editing Profile Functions
  const MIDDLE_INITIAL_PATTERN = /^\p{L}{1,2}$/u

  function formatPhone(phone: string) {
    const normalized = normalizeMobile(phone)
    if (normalized) {
      const digits = normalized.slice(3)
      return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    }
    return phone
  }

  function getPhoneDigits(phone: string) {
    const normalized = normalizeMobile(phone)
    return normalized ? normalized.slice(3) : phone.replace(/\D/g, '').slice(-10)
  }

  const handleEdit = () => {
    if (!profile) return

    setFormValues({
      first_name: profile.first_name,
      middle_initial: profile.middle_initial ?? '',
      last_name: profile.last_name,
      phone: getPhoneDigits(profile.phone),
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
    setError('')
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
      formValues.phone !== getPhoneDigits(profile.phone))
  const firstNameResult = validateName(formValues?.first_name ?? '', 'First name')
  const firstNameIsValid = !firstNameResult.error
  const middleInitial = formValues?.middle_initial.trim() ?? ''
  const middleInitialIsValid =
    middleInitial.length === 0 || MIDDLE_INITIAL_PATTERN.test(middleInitial)
  const lastNameResult = validateName(formValues?.last_name ?? '', 'Last name')
  const lastNameIsValid = !lastNameResult.error
  const phoneIsValid =
    formValues !== null && /^9\d{9}$/.test(formValues.phone)

  // Capitalize each name word and keep the middle initial uppercase.
  const formatName = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

  const handleSave = async () => {
    if (
      !profile ||
      !formValues ||
      !hasChanges ||
      !firstNameIsValid ||
      !middleInitialIsValid ||
      !lastNameIsValid ||
      !phoneIsValid ||
      saveLocked.current
    ) {
      return
    }

    const normalizedPhone = normalizeMobile(`+63${formValues.phone}`)
    if (!normalizedPhone) return
    const releaseCooldown = () => {
      saveLocked.current = false
      cooldownEndsAt.current = 0
      setCooldownSeconds(0)
    }

    saveLocked.current = true
    cooldownEndsAt.current = Date.now() + 30_000
    setCooldownSeconds(30)
    setSaving(true)
    setError('')
    setMessage('Saving changes...')

    const updatedValues = {
      first_name: firstNameResult.value,
      middle_initial: middleInitial ? middleInitial.toUpperCase() : null,
      last_name: lastNameResult.value,
      phone: normalizedPhone,
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        releaseCooldown()
        setError(
          'Could not save your profile. Probable cause: your account session has expired. Sign in again and retry.',
        )
        setMessage('')
        return
      }

      const { data, error: saveError } = await supabase
        .from('profiles')
        .update(updatedValues)
        .eq('id', user.id)
        .select('id')
        .maybeSingle()

      if (saveError) {
        releaseCooldown()
        const detail = `${saveError.code ?? ''} ${saveError.message}`.toLowerCase()
        if (/failed to fetch|network|internet/.test(detail)) {
          setError(
            'Could not save your profile. Probable cause: a network connection problem. Check your connection and try again.',
          )
        } else if (
          saveError.code === '42501' ||
          /row-level security|permission denied|not allowed/.test(detail)
        ) {
          setError(
            'Could not save your profile. Probable cause: your account does not have permission to update this profile.',
          )
        } else if (
          /^[23]/.test(saveError.code ?? '') ||
          /constraint|invalid input|violates|duplicate key/.test(detail)
        ) {
          setError(
            'Could not save your profile. Probable cause: one or more values were rejected by the server. Review your entries and try again.',
          )
        } else {
          setError(
            'Could not save your profile. Probable cause: the server rejected the update or is temporarily unavailable. Please try again.',
          )
        }
        setMessage('')
        return
      }

      if (!data || data.id !== user.id) {
        releaseCooldown()
        setError(
          'Could not confirm your profile was saved. Probable cause: the profile was not found, your account lacks permission, or the server returned a different profile.',
        )
        setMessage('')
        return
      }

      setProfile((currentProfile) =>
        currentProfile ? { ...currentProfile, ...updatedValues } : currentProfile,
      )
      setFormValues({
        first_name: updatedValues.first_name,
        middle_initial: updatedValues.middle_initial ?? '',
        last_name: updatedValues.last_name,
        phone: getPhoneDigits(updatedValues.phone),
      })
      setMessage('Profile updated successfully.')
    } catch (saveError) {
      releaseCooldown()
      const detail =
        saveError instanceof Error ? saveError.message.toLowerCase() : ''
      setError(
        /failed to fetch|network|internet/.test(detail)
          ? 'Could not save your profile. Probable cause: a network connection problem. Check your connection and try again.'
          : 'Could not save your profile. Probable cause: an unexpected server or connection error. Please try again.',
      )
      setMessage('')
    } finally {
      setSaving(false)
    }
  }

  // Render the account page and its edit/view modes.


  return (
    <div className="account-page">
      <h1>My Account</h1>

      {error && <p className="profile-save-notice profile-save-error" role="alert">{error}</p>}
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
                maxLength={LIMITS.name.max}
                aria-invalid={!firstNameIsValid}
                disabled={saving}
                required
              />
              {!firstNameIsValid && <p role="alert">{firstNameResult.error}</p>}
            </div>

            <div>
              <label htmlFor="middle_initial">Middle Initial (optional)</label>
              <input
                id="middle_initial"
                type="text"
                maxLength={2}
                placeholder="Optional"
                value={formValues.middle_initial}
                onChange={(event) =>
                  handleChange(
                    'middle_initial',
                    event.target.value.replace(/\P{L}/gu, '').slice(0, 2),
                  )
                }
                aria-invalid={!middleInitialIsValid}
                disabled={saving}
              />
              {!middleInitialIsValid && (
                <p role="alert">Enter up to two letters for the middle initial.</p>
              )}
            </div>

            <div>
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                type="text"
                value={formValues.last_name}
                onChange={(event) => handleChange('last_name', event.target.value)}
                maxLength={LIMITS.name.max}
                aria-invalid={!lastNameIsValid}
                disabled={saving}
                required
              />
              {!lastNameIsValid && <p role="alert">{lastNameResult.error}</p>}
            </div>

            <div>
              <label htmlFor="phone">Phone</label>
              <div className="phone-input-row">
                <span aria-hidden="true">+63</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={formValues.phone}
                  onChange={(event) => {
                    let digits = event.target.value.replace(/\D/g, '')
                    if (digits.startsWith('63')) digits = digits.slice(2)
                    else if (digits.startsWith('0')) digits = digits.slice(1)
                    handleChange('phone', digits.slice(0, 10))
                  }}
                  aria-invalid={!phoneIsValid}
                  disabled={saving}
                  required
                />
              </div>
              {!phoneIsValid && (
                <p role="alert">Enter 10 digits after +63, starting with 9.</p>
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
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !hasChanges ||
                  !firstNameIsValid ||
                  !middleInitialIsValid ||
                  !lastNameIsValid ||
                  !phoneIsValid ||
                  saving ||
                  cooldownSeconds > 0
                }
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            {(message || cooldownSeconds > 0) && (
              <div className="profile-save-status">
                {message && (
                  <p className="profile-save-notice profile-save-success" role="status">
                    {message}
                  </p>
                )}
                {cooldownSeconds > 0 && (
                  <p className="profile-save-cooldown">
                    You can save again in {cooldownSeconds} seconds.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default UserAccounts
