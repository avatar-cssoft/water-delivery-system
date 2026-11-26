
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

import DropoffPicker from '../../components/DropoffPicker'
import { deliveryPoint, type Point } from '../../lib/deliveryMap'
import { normalizeMobile } from '../../lib/validation/register'
import { validateSavedAddress } from '../../lib/validation/address'

type Address = {
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_instructions?: string | null

  id: string
  user_id: string
  recipient_name: string
  phone: string
  label: string | null
  address_line: string
  barangay: string
  city: string
  province: string
  postal_code: string | null
  is_default: boolean
  created_at: string
}

const initialForm = {
  recipient_name: '',
  phone: '',
  label: 'Home',
  address_line: '',
  barangay: '',
  city: '',
  province: '',
  postal_code: ''
}

function AddressLogbook() {
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [userId, setUserId] = useState('')
  const [point, setPoint] = useState<Point | null>(null)
  const [instructions, setInstructions] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reloadAddresses = () => setReloadKey(key => key + 1)

  const formatAddress = (address: Pick<
    Address,
    'address_line' | 'barangay' | 'city' | 'province' | 'postal_code'
  >) =>
    [
      address.address_line,
      address.barangay,
      address.city,
      address.province,
      address.postal_code,
    ]
      .filter(Boolean)
      .join(', ')

  const syncProfileAddress = async (address: Pick<
    Address,
    'address_line' | 'barangay' | 'city' | 'province' | 'postal_code'
  >) => {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ address: formatAddress(address) })
      .eq('id', userId)

    if (profileError) throw profileError
  }

  // Fetch logged-in user's addresses
  useEffect(() => {
    let cancelled = false

    const fetchAddresses = async () => {
      try {
        const { data: { user }, error: sessionError } =
          await supabase.auth.getUser()
        if (cancelled) return

        if (sessionError || !user) {
          setSignedIn(false)
          return
        }

        setSignedIn(true)
        setUserId(user.id)

        const { data, error: fetchError } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (cancelled) return

        if (fetchError) throw fetchError

        setAddresses(data || [])
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load addresses.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchAddresses()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target
    const value = name === 'postal_code'
      ? e.target.value.replace(/\D/g, '').slice(0, 4)
      : e.target.value
    if (['address_line', 'barangay', 'city', 'province', 'postal_code'].includes(name)) setPoint(null)

    setForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Open form for adding an address
  const handleAdd = () => {
    setEditingId(null)
    setPoint(null)
    setInstructions('')
    setForm(initialForm)
    setShowForm(true)
    setError('')
  }

  // Open form for editing an address
  const handleEdit = (address: Address) => {
    setEditingId(address.id)
    setPoint(deliveryPoint(address))
    setInstructions(address.delivery_instructions ?? '')

    setForm({
      recipient_name: address.recipient_name,
      phone: normalizeMobile(address.phone) ?? address.phone,
      label: address.label || 'Home',
      address_line: address.address_line,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      postal_code: address.postal_code || ''
    })

    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Save or update address
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validation = validateSavedAddress(form)
    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setSaving(true)

    const addressFields = {
      ...validation.data,
      label: form.label,
      delivery_latitude: point?.latitude ?? null,
      delivery_longitude: point?.longitude ?? null,
      delivery_instructions: instructions.trim() || null,
    }

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('addresses')
          .update(addressFields)
          .eq('id', editingId)
          .eq('user_id', userId)

        if (updateError) throw updateError
        if (addresses.some(address => address.id === editingId && address.is_default)) {
          await syncProfileAddress(addressFields)
        }
      } else {
        const isDefault = addresses.length === 0
        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            ...addressFields,
            user_id: userId,
            is_default: isDefault
          })

        if (insertError) throw insertError
        if (isDefault) await syncProfileAddress(addressFields)
      }

      setForm(initialForm)
      setShowForm(false)
      setEditingId(null)

      reloadAddresses()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save address.'
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete address
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return
    }

    setError('')

    const { error: deleteError } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    reloadAddresses()
  }

  // Set default address
  const handleSetDefault = async (id: string) => {
    setError('')

    try {
      const address = addresses.find(item => item.id === id)
      if (!address) throw new Error('The selected address could not be found.')

      const { error: resetError } = await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)

      if (resetError) throw resetError

      const { error: updateError } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) throw updateError

      await syncProfileAddress(address)
      reloadAddresses()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update default address.'
      )
      reloadAddresses()
    }
  }

  if (loading) {
    return <p>Checking your account...</p>
  }

  if (!signedIn) {
    return (
      <section>
        <h1>Address Logbook</h1>
        <p role="alert">{error || 'You must sign in to access the Address Logbook.'}</p>
        <Link to="/login">
          Sign in
        </Link>
      </section>
    )
  }

  return (
    <main className="address-logbook">

      {/* Header */}
      <div className="address-logbook-header">
        <div>
          <h1>
            Address Logbook
          </h1>
          <p>
            Manage your saved delivery addresses.
          </p>
        </div>

        <button
          onClick={showForm ? () => {
            setShowForm(false)
            setEditingId(null)
            setForm(initialForm)
          } : handleAdd}
          className={showForm ? 'address-cancel-button' : undefined}
        >
          {showForm ? 'Cancel' : '+ Add Address'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      {/* Add / Edit Address Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="address-form"
        >
          <h2>
            {editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </h2>

          <div className="address-form-fields">

            <input
              name="recipient_name"
              placeholder="Recipient Name"
              value={form.recipient_name}
              onChange={handleChange}
              maxLength={50}
              required
            />

            <input
              name="phone"
              type="tel"
              placeholder="+639XXXXXXXXX"
              autoComplete="tel"
              inputMode="tel"
              maxLength={20}
              value={form.phone}
              onChange={handleChange}
              required
            />

            <select
              name="label"
              value={form.label}
              onChange={handleChange}
            >
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>

            <input
              name="address_line"
              placeholder="House Number / Street"
              value={form.address_line}
              onChange={handleChange}
              maxLength={255}
              required
            />

            <input
              name="barangay"
              placeholder="Barangay"
              value={form.barangay}
              onChange={handleChange}
              maxLength={100}
              required
            />

            <input
              name="city"
              placeholder="City / Municipality"
              value={form.city}
              onChange={handleChange}
              maxLength={100}
              required
            />

            <input
              name="province"
              placeholder="Province"
              value={form.province}
              onChange={handleChange}
              maxLength={100}
              required
            />

            <input
              name="postal_code"
              placeholder="Postal Code (Optional, 4 digits)"
              value={form.postal_code}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
            />

          </div>

          <DropoffPicker key={JSON.stringify([form.address_line, form.barangay, form.city, form.province, form.postal_code])}
            point={point} onChange={setPoint} />
          <label htmlFor="saved-delivery-instructions">Delivery instructions (optional)</label>
          <input id="saved-delivery-instructions" value={instructions} maxLength={500}
            onChange={event => setInstructions(event.target.value)} />

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : editingId
                ? 'Update Address'
                : 'Save Address'}
          </button>
        </form>
      )}

      {/* Saved Addresses */}
      <section>
        <h2>
          Saved Addresses ({addresses.length})
        </h2>

        {addresses.length === 0 ? (
          <div className="address-empty">
            <p>
              You don't have any saved addresses yet.
            </p>
            <p>
              Add an address to make ordering easier.
            </p>
          </div>
        ) : (
          <div className="address-list">

            {addresses.map(address => (
              <article key={address.id} className="address-card">
                <div className="address-card-header">
                  <div>
                    <h3>
                      {address.label || 'Other'}
                    </h3>

                    {address.is_default && (
                      <span className="address-default-badge">
                        Default Delivery Address
                      </span>
                    )}
                  </div>

                  <div className="address-card-actions">
                    <button
                      onClick={() => handleEdit(address)}
                      className="address-text-button"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(address.id)}
                      className="address-text-button address-delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="address-card-details">
                  <p>
                    <strong>Recipient:</strong> {address.recipient_name}
                  </p>

                  <p>
                    <strong>Phone:</strong> {address.phone}
                  </p>

                  <p>
                    <strong>Address:</strong>{' '}
                    {[
                      address.address_line,
                      address.barangay,
                      address.city,
                      address.province,
                      address.postal_code
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>

                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="address-text-button address-default-button"
                  >
                    Set as Default
                  </button>
                )}

              </article>
            ))}

          </div>
        )}
      </section>

      {/* Back to Account */}
      <div className="address-logbook-back">
        <Link to="/settings">
          ← Back to Settings
        </Link>
      </div>

    </main>
  )
}

export default AddressLogbook
