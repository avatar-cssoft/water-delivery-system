
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getCart, clearCart } from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'

import DropoffPicker from '../../components/DropoffPicker'
import { deliveryPoint, type Point } from '../../lib/deliveryMap'

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

export default function Checkout() {
  const navigate = useNavigate()

  const outletContext = useOutletContext<
    { setCheckoutComplete: (complete: boolean) => void } | undefined
  >()

  const setCheckoutComplete = outletContext?.setCheckoutComplete

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [address, setAddress] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [addressLoading, setAddressLoading] = useState(true)
  const [point, setPoint] = useState<Point | null>(null)
  const [instructions, setInstructions] = useState('')
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [pendingOrderReference, setPendingOrderReference] =
    useState<string | null>(null)

  const [showOrderPlaced, setShowOrderPlaced] = useState(false)
  const [orderReference, setOrderReference] = useState<string | null>(null)
  const [millisecondsLeft, setMillisecondsLeft] = useState(5000)

  const [copyState, setCopyState] =
    useState<'idle' | 'copied' | 'error'>('idle')

  const cart = getCart()

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  // Format a saved address.
  function formatAddress(savedAddress: Address) {
    return [
      savedAddress.address_line,
      savedAddress.barangay,
      savedAddress.city,
      savedAddress.province,
      savedAddress.postal_code
    ]
      .filter(Boolean)
      .join(', ')
  }

  // Load the default saved address, falling back to the legacy profile address.
  useEffect(() => {
    let cancelled = false

    async function loadAddresses() {
      try {
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser()

        if (userError) {
          throw new Error(
            `Could not load your saved delivery address: ${userError.message}`,
          )
        }

        if (!user) {
          navigate('/login')
          return
        }

        const { data, error: addressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)

        if (cancelled) return

        if (addressError) {
          throw new Error(
            `Could not load your saved delivery address: ${addressError.message}`,
          )
        }

        const savedAddresses = ((data ?? []) as Address[]).sort(
          (a, b) => {
            if (a.is_default !== b.is_default) {
              return Number(b.is_default) - Number(a.is_default)
            }

            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            )
          }
        )
        setAddresses(savedAddresses)

        const defaultAddress =
          savedAddresses.find(item => item.is_default) ||
          savedAddresses[0]

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          setRecipientName(defaultAddress.recipient_name)
          setPoint(deliveryPoint(defaultAddress))
          setInstructions(defaultAddress.delivery_instructions ?? '')
          setAddress(formatAddress(defaultAddress))
        } else {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('address, first_name, last_name')
            .eq('id', user.id)
            .single()

          if (cancelled) return

          if (profileError) {
            throw new Error(
              `Could not load your saved delivery address: ${profileError.message}`,
            )
          }

          const profileData = profile as {
            address: string | null
            first_name: string | null
            last_name: string | null
          } | null
          const savedProfileAddress = profileData?.address
          setRecipientName(
            [profileData?.first_name, profileData?.last_name]
              .filter(Boolean)
              .join(' '),
          )

          if (!savedProfileAddress?.trim()) {
            setError(
              'No saved delivery address was found. Add one to your account before placing an order.',
            )
            return
          }

          setAddress(savedProfileAddress)
        }
      } catch (err) {
        console.error('Could not load saved delivery address:', err)
        if (!cancelled) {
          const detail =
            err instanceof Error ? err.message : 'an unexpected error occurred'
          setError(
            detail.startsWith('Could not load your saved delivery address:')
              ? detail
              : `Could not load your saved delivery address: ${detail}`,
          )
        }
      } finally {
        if (!cancelled) {
          setAddressLoading(false)
        }
      }
    }

    void loadAddresses()

    return () => {
      cancelled = true
    }
  }, [navigate])

  function handleAddressSelection(id: string) {
    const selectedAddress = addresses.find(item => item.id === id)

    if (!selectedAddress) {
      setError('The selected saved address could not be found.')
      return
    }

    setSelectedAddressId(id)
    setRecipientName(selectedAddress.recipient_name)
    setError('')
    setPoint(deliveryPoint(selectedAddress))
    setInstructions(selectedAddress.delivery_instructions ?? '')
    setAddress(formatAddress(selectedAddress))
  }

  // Reset checkout state when leaving.
  useEffect(() => {
    return () => setCheckoutComplete?.(false)
  }, [setCheckoutComplete])

  // Show order placed confirmation.
  useEffect(() => {
    if (!showOrderPlaced || !pendingOrderReference) return

    const revealReference = window.setTimeout(() => {
      setShowOrderPlaced(false)
      setOrderReference(pendingOrderReference)
    }, 1500)

    return () => window.clearTimeout(revealReference)
  }, [pendingOrderReference, showOrderPlaced])

  // Five-second redirect countdown.
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

  // Reset copy button.
  useEffect(() => {
    if (copyState !== 'copied') return

    const reset = window.setTimeout(() => {
      setCopyState('idle')
    }, 1400)

    return () => window.clearTimeout(reset)
  }, [copyState])

  async function placeOrder() {
    if (cart.length === 0) {
      setError('Your cart is empty.')
      return
    }

    if (!address.trim()) {
      setError('Please enter your delivery address.')
      return
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

      // Create order.
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          recipient_name: recipientName.trim() || null,
          delivery_address: address.trim(),
          ...(point ? { delivery_latitude: point.latitude, delivery_longitude: point.longitude } : {}),
          ...(instructions.trim() ? { delivery_instructions: instructions.trim() } : {}),
          total_amount: total,
          status: 'pending'
        })
        .select('id, order_reference')
        .single()

      if (orderError) throw orderError

      if (!order) {
        throw new Error('Unable to create your order.')
      }

      if (!order.order_reference) {
        throw new Error(
          `Order #${order.id} was created, but its reference number was not generated. Configure a database default or trigger for order_reference.`
        )
      }

      // Insert order items.
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

      // Clear cart after successful order.
      clearCart()

      setCheckoutComplete?.(true)
      setPlacedOrderId(order.id)
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

  // Copy order reference.
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

  // Order placed screen.
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

  // Order reference screen.
  if (orderReference) {
    return (
      <main className="checkout-confirmation">
        <h1>Order Reference Number</h1>
        {placedOrderId !== null && <Link to={`/orders/${placedOrderId}/track`}>Track this order</Link>}

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

  // Checkout screen.
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
          <h2 className="checkout-order-summary-title">Order Summary</h2>

          {cart.map(item => (
            <div className="checkout-summary-item" key={item.product.id}>
              <p>
                {item.product.name} × {item.quantity}
              </p>

              <p>
                {formatPrice(item.product.price * item.quantity)}
              </p>
            </div>
          ))}

          <h3 className="checkout-summary-total">Total: {formatPrice(total)}</h3>

          <section className="checkout-delivery-section">
            <div className="checkout-delivery-header">
              <h2>Delivery Address</h2>
              <button
                className="checkout-manage-addresses"
                type="button"
                onClick={() => navigate('/account/address-logbook')}
              >
                Manage Saved Addresses
              </button>
            </div>

            {addresses.length > 0 && (
              <div className="checkout-saved-address">
                <label htmlFor="saved-address">Choose a saved address</label>
                <select
                  id="saved-address"
                  value={selectedAddressId}
                  onChange={event =>
                    handleAddressSelection(event.target.value)
                  }
                  disabled={addressLoading || loading}
                >
                  {addresses.map(savedAddress => (
                    <option key={savedAddress.id} value={savedAddress.id}>
                      {savedAddress.label || 'Other'}
                      {savedAddress.is_default ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {addressLoading && <p>Loading saved addresses...</p>}

            <div className="checkout-selected-address">
              <label htmlFor="delivery-address">Selected delivery address</label>
              <input
                className="checkout-delivery-address"
                id="delivery-address"
                type="text"
                value={address}
                readOnly
                aria-readonly="true"
                aria-label="Delivery Address"
                placeholder="Loading saved delivery address..."
                required
              />
            </div>

            <div className="checkout-delivery-instructions">
              <label htmlFor="checkout-delivery-instructions">
                Delivery instructions (optional)
              </label>
              <input
                id="checkout-delivery-instructions"
                value={instructions}
                maxLength={500}
                onChange={event => setInstructions(event.target.value)}
              />
            </div>

            <fieldset>
              <legend>Requested delivery window</legend>
              <p>
                <strong>WIP</strong> — delivery scheduling will be available
                soon.
              </p>
            </fieldset>

            <DropoffPicker key={address} point={point} onChange={setPoint} />

            {error && <p role="alert">{error}</p>}

            <button
              type="button"
              onClick={placeOrder}
              disabled={
                loading ||
                addressLoading ||
                !address.trim() ||
                cart.length === 0
              }
            >
              {loading
                ? 'Placing Order...'
                : addressLoading
                  ? 'Loading Address...'
                  : 'Place Order'}
            </button>
          </section>
        </>
      )}
    </main>
  )
}
