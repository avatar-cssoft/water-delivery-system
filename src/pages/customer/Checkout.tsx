import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getCart, clearCart } from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'

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

export default function Checkout() {
  const navigate = useNavigate()

  const outletContext = useOutletContext<
    { setCheckoutComplete: (complete: boolean) => void } | undefined
  >()

  const setCheckoutComplete = outletContext?.setCheckoutComplete

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [useManualAddress, setUseManualAddress] = useState(false)

  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [pendingOrderReference, setPendingOrderReference] = useState<string | null>(null)
  const [showOrderPlaced, setShowOrderPlaced] = useState(false)
  const [orderReference, setOrderReference] = useState<string | null>(null)
  const [millisecondsLeft, setMillisecondsLeft] = useState(5000)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const cart = getCart()

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  // Load saved addresses belonging to the logged-in customer.
  useEffect(() => {
    let cancelled = false

    const loadAddresses = async () => {
      try {
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser()

        if (userError) throw userError

        if (!user) {
          navigate('/login')
          return
        }

        const { data, error: addressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })

        if (addressError) throw addressError

        if (cancelled) return

        const savedAddresses = (data || []) as Address[]

        setAddresses(savedAddresses)

        // Automatically select the default address.
        const defaultAddress = savedAddresses.find(
          address => address.is_default
        )

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
        } else if (savedAddresses.length > 0) {
          setSelectedAddressId(savedAddresses[0].id)
        } else {
          // Allow manual address entry if no saved address exists.
          setUseManualAddress(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load saved addresses.'
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingAddresses(false)
        }
      }
    }

    void loadAddresses()

    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    return () => setCheckoutComplete?.(false)
  }, [setCheckoutComplete])

  // Show order confirmation.
  useEffect(() => {
    if (!showOrderPlaced || !pendingOrderReference) return

    const revealReference = window.setTimeout(() => {
      setShowOrderPlaced(false)
      setOrderReference(pendingOrderReference)
    }, 1500)

    return () => window.clearTimeout(revealReference)
  }, [pendingOrderReference, showOrderPlaced])

  // Redirect after showing the order reference.
  useEffect(() => {
    if (!orderReference) return

    const startedAt = Date.now()

    const countdown = window.setInterval(() => {
      setMillisecondsLeft(
        Math.max(0, 5000 - (Date.now() - startedAt))
      )
    }, 50)

    const redirect = window.setTimeout(
      () => navigate('/customerHome'),
      5000
    )

    return () => {
      window.clearInterval(countdown)
      window.clearTimeout(redirect)
    }
  }, [navigate, orderReference])

  // Reset copy status.
  useEffect(() => {
    if (copyState !== 'copied') return

    const resetCopyState = window.setTimeout(() => {
      setCopyState('idle')
    }, 1400)

    return () => window.clearTimeout(resetCopyState)
  }, [copyState])

  // Format a saved address for the order.
  const formatAddress = (address: Address) => {
    return [
      address.recipient_name,
      address.phone,
      address.address_line,
      address.barangay,
      address.city,
      address.province,
      address.postal_code
    ]
      .filter(Boolean)
      .join(', ')
  }

  // Place order.
  async function placeOrder() {
    if (cart.length === 0) {
      setError('Your cart is empty.')
      return
    }

    let deliveryAddress = ''

    if (useManualAddress) {
      deliveryAddress = manualAddress.trim()

      if (!deliveryAddress) {
        setError('Please enter your delivery address.')
        return
      }
    } else {
      const selectedAddress = addresses.find(
        address => address.id === selectedAddressId
      )

      if (!selectedAddress) {
        setError('Please select a delivery address.')
        return
      }

      deliveryAddress = formatAddress(selectedAddress)
    }

    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error('Please log in before placing your order.')
      }

      // Create the main order with the selected delivery address.
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          delivery_address: deliveryAddress,
          total_amount: total,
          status: 'pending'
        })
        .select('id, order_reference')
        .single()

      if (orderError) throw orderError

      if (!order.order_reference) {
        throw new Error(
          `Order #${order.id} was created, but its reference number was not generated. Configure a database default or trigger for order_reference.`
        )
      }

      // Save products belonging to this order.
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw new Error(
          `Order #${order.id} was created, but its items could not be saved. ${itemsError.message}`
        )
      }

      clearCart()

      setCheckoutComplete?.(true)
      setPendingOrderReference(order.order_reference)
      setShowOrderPlaced(true)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to place your order.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function copyReference() {
    if (!orderReference) {
      setCopyState('error')
      return
    }

    try {
      await navigator.clipboard.writeText(orderReference)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  const copyMessage =
    copyState === 'copied'
      ? 'Reference number copied.'
      : copyState === 'error'
        ? 'Unable to copy the reference number. Please copy it manually.'
        : ''

  if (loadingAddresses) {
    return <p>Loading your delivery addresses...</p>
  }

  if (showOrderPlaced) {
    return (
      <main
        className="checkout-confirmation checkout-order-placed"
        role="status"
      >
        <div className="checkout-success-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path d="M12 25l8 8 17-18" />
          </svg>
        </div>
        <h1>Order placed</h1>
      </main>
    )
  }

  if (orderReference) {
    return (
      <main className="checkout-confirmation">
        <h1>Order Reference Number</h1>

        <div className="checkout-reference-row">
          <input
            className="profile-readonly-address checkout-reference-value"
            type="text"
            value={orderReference}
            readOnly
            aria-readonly="true"
            aria-label="Order reference number"
          />

          <button
            className={`checkout-reference-copy${copyState === 'copied' ? ' is-copied' : ''}`}
            type="button"
            onClick={copyReference}
            disabled={copyState === 'copied'}
            aria-label={
              copyState === 'copied'
                ? 'Copied'
                : 'Copy order reference'
            }
          >
            {copyState === 'copied' ? (
              <svg
                className="checkout-copy-check"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            ) : (
              'Copy'
            )}
          </button>
        </div>

        <p
          className={
            copyState === 'error'
              ? 'checkout-copy-error'
              : 'checkout-copy-status'
          }
          role="status"
          aria-live="polite"
        >
          {copyMessage}
        </p>

        <p>
          Redirecting you to customer home in{' '}
          {Math.ceil(millisecondsLeft / 1000)} seconds.
        </p>

        <div
          className="checkout-progress"
          aria-label="Time until redirect"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={5000}
          aria-valuenow={millisecondsLeft}
        >
          <span
            style={{
              width: `${(millisecondsLeft / 5000) * 100}%`
            }}
          />
        </div>

        <button
          className="checkout-keep-looking"
          type="button"
          onClick={() => navigate('/catalog')}
        >
          Keep Looking
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Checkout</h1>

      <button
        type="button"
        onClick={() => navigate('/cart')}
      >
        Back to Cart
      </button>

      {cart.length === 0 ? (
        <p>Your cart is empty. Please add products first.</p>
      ) : (
        <>
          <h2>Order Summary</h2>

          {cart.map(item => (
            <div key={item.product.id}>
              <p>
                {item.product.name} × {item.quantity}
              </p>
              <p>
                {formatPrice(item.product.price * item.quantity)}
              </p>
            </div>
          ))}

          <h3>Total: {formatPrice(total)}</h3>

          <h2>Delivery Address</h2>

          {addresses.length > 0 && (
            <>
              <label htmlFor="saved-address">
                Choose a saved delivery address
              </label>

              <select
                id="saved-address"
                value={useManualAddress ? 'manual' : selectedAddressId}
                onChange={event => {
                  const value = event.target.value

                  if (value === 'manual') {
                    setUseManualAddress(true)
                  } else {
                    setUseManualAddress(false)
                    setSelectedAddressId(value)
                  }

                  setError('')
                }}
              >
                {addresses.map(address => (
                  <option key={address.id} value={address.id}>
                    {address.label || 'Other'}
                    {address.is_default ? ' (Default)' : ''}
                    {' - '}
                    {address.address_line}, {address.barangay},{' '}
                    {address.city}
                  </option>
                ))}

                <option value="manual">
                  Enter a different address
                </option>
              </select>

              {!useManualAddress && selectedAddressId && (
                <div className="checkout-selected-address">
                  {(() => {
                    const selected = addresses.find(
                      address => address.id === selectedAddressId
                    )

                    if (!selected) return null

                    return (
                      <>
                        <p>
                          <strong>Recipient:</strong>{' '}
                          {selected.recipient_name}
                        </p>
                        <p>
                          <strong>Phone:</strong> {selected.phone}
                        </p>
                        <p>
                          <strong>Address:</strong>{' '}
                          {[
                            selected.address_line,
                            selected.barangay,
                            selected.city,
                            selected.province,
                            selected.postal_code
                          ].filter(Boolean).join(', ')}
                        </p>
                      </>
                    )
                  })()}
                </div>
              )}
            </>
          )}

          {useManualAddress && (
            <>
              <label htmlFor="manual-delivery-address">
                Enter Delivery Address
              </label>

              <textarea
                id="manual-delivery-address"
                value={manualAddress}
                onChange={event => setManualAddress(event.target.value)}
                placeholder="Enter your complete delivery address"
                required
                rows={3}
              />
            </>
          )}

          {addresses.length === 0 && (
            <>
              <p>
                You don't have any saved addresses yet. Enter your
                delivery address below.
              </p>

              <label htmlFor="manual-delivery-address">
                Delivery Address
              </label>

              <textarea
                id="manual-delivery-address"
                value={manualAddress}
                onChange={event => setManualAddress(event.target.value)}
                placeholder="Enter your complete delivery address"
                required
                rows={3}
              />
            </>
          )}

          <p>
            <button
              type="button"
              onClick={() => navigate('/account')}
            >
              Manage Saved Addresses
            </button>
          </p>

          {error && <p role="alert">{error}</p>}

          <button
            type="button"
            onClick={placeOrder}
            disabled={loading}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </>
      )}
    </main>
  )
}
