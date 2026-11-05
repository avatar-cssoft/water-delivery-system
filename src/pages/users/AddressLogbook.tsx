
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

  // Fetch logged-in user's addresses
  const fetchAddresses = async () => {
    try {
      const { data: { user }, error: sessionError } =
        await supabase.auth.getUser()

      if (sessionError || !user) {
        setSignedIn(false)
        setError('Please sign in again.')
        return
      }

      setSignedIn(true)
      setUserId(user.id)

      const { data, error: fetchError } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setAddresses(data || [])
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load addresses.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAddresses()
  }, [])

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

      await fetchAddresses()
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

    const { error: deleteError } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    await fetchAddresses()
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

      await fetchAddresses()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update default address.'
      )
      await fetchAddresses()
    }
  }

  if (loading) {
    return <p className="p-6">Checking your account...</p>
  }

  if (!signedIn) {
    return (
      <section className="p-6">
        <h1 className="text-2xl font-bold">Address Logbook</h1>
        <p role="alert">{error || 'Please sign in first.'}</p>
        <Link to="/login" className="text-blue-600">
          Sign in
        </Link>
      </section>
    )
  }

  return (
    <main className="max-w-4xl mx-auto p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Address Logbook
          </h1>
          <p className="text-gray-500">
            Manage your saved delivery addresses.
          </p>
        </div>

        <button
          onClick={showForm ? () => {
            setShowForm(false)
            setEditingId(null)
            setForm(initialForm)
          } : handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ Add Address'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 mb-4" role="alert">
          {error}
        </p>
      )}

      {/* Add / Edit Address Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-xl p-5 mb-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">
            {editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            <input
              name="recipient_name"
              placeholder="Recipient Name"
              value={form.recipient_name}
              onChange={handleChange}
              required
              className="border rounded-lg p-3 w-full"
            />

            <input
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
              required
              className="border rounded-lg p-3 w-full"
            />

            <select
              name="label"
              value={form.label}
              onChange={handleChange}
              className="border rounded-lg p-3 w-full"
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
              className="border rounded-lg p-3 w-full"
            />

            <input
              name="barangay"
              placeholder="Barangay"
              value={form.barangay}
              onChange={handleChange}
              required
              className="border rounded-lg p-3 w-full"
            />

            <input
              name="city"
              placeholder="City / Municipality"
              value={form.city}
              onChange={handleChange}
              required
              className="border rounded-lg p-3 w-full"
            />

            <input
              name="province"
              placeholder="Province"
              value={form.province}
              onChange={handleChange}
              required
              className="border rounded-lg p-3 w-full"
            />

            <input
              name="postal_code"
              placeholder="Postal Code (Optional)"
              value={form.postal_code}
              onChange={handleChange}
              className="border rounded-lg p-3 w-full"
            />

          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg disabled:opacity-50"
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
        <h2 className="text-lg font-semibold mb-4">
          Saved Addresses ({addresses.length})
        </h2>

        {addresses.length === 0 ? (
          <div className="border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              You don't have any saved addresses yet.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Add an address to make ordering easier.
            </p>
          </div>
        ) : (
          <div className="space-y-4">

            {addresses.map(address => (
              <div
                key={address.id}
                className="border rounded-xl p-5"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {address.label || 'Other'}
                    </h3>

                    {address.is_default && (
                      <span className="text-green-600 text-sm font-medium">
                        Default Delivery Address
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(address)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
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
                    className="text-blue-600 text-sm mt-3 hover:underline"
                  >
                    Set as Default
                  </button>
                )}

              </div>
            ))}

          </div>
        )}
      </section>

      {/* Back to Account */}
      <div className="mt-6">
        <Link
          to="/account"
          className="text-blue-600 hover:underline"
        >
          ← Back to My Account
        </Link>
      </div>

    </main>
  )
}

export default AddressLogbook
