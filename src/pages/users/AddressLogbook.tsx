
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Address = {
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
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reloadAddresses = () => setReloadKey(key => key + 1)

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
    const { name, value } = e.target

    setForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Open form for adding an address
  const handleAdd = () => {
    setEditingId(null)
    setForm(initialForm)
    setShowForm(true)
    setError('')
  }

  // Open form for editing an address
  const handleEdit = (address: Address) => {
    setEditingId(address.id)

    setForm({
      recipient_name: address.recipient_name,
      phone: address.phone,
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
    setSaving(true)
    setError('')

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('addresses')
          .update(form)
          .eq('id', editingId)
          .eq('user_id', userId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('addresses')
          .insert({
            ...form,
            user_id: userId,
            is_default: addresses.length === 0
          })

        if (insertError) throw insertError
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
              required
            />

            <input
              name="phone"
              placeholder="Phone Number"
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
              required
            />

            <input
              name="barangay"
              placeholder="Barangay"
              value={form.barangay}
              onChange={handleChange}
              required
            />

            <input
              name="city"
              placeholder="City / Municipality"
              value={form.city}
              onChange={handleChange}
              required
            />

            <input
              name="province"
              placeholder="Province"
              value={form.province}
              onChange={handleChange}
              required
            />

            <input
              name="postal_code"
              placeholder="Postal Code (Optional)"
              value={form.postal_code}
              onChange={handleChange}
            />

          </div>

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
        <Link to="/account">
          ← Back to My Account
        </Link>
      </div>

    </main>
  )
}

export default AddressLogbook
