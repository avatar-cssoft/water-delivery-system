
import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getCart, clearCart } from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'

export default function Checkout() {
  const navigate = useNavigate()
  const outletContext = useOutletContext<
    { setCheckoutComplete: (complete: boolean) => void } | undefined
  >()
  const setCheckoutComplete = outletContext?.setCheckoutComplete
  const [address, setAddress] = useState('')
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
    0,
  )

  useEffect(() => {
    return () => setCheckoutComplete?.(false)
  }, [setCheckoutComplete])

  useEffect(() => {
    if (!showOrderPlaced || !pendingOrderReference) return

    const revealReference = window.setTimeout(() => {
      setShowOrderPlaced(false)
      setOrderReference(pendingOrderReference)
    }, 1500)

    return () => window.clearTimeout(revealReference)
  }, [pendingOrderReference, showOrderPlaced])

  useEffect(() => {
    if (!orderReference) return

    const startedAt = Date.now()
    const countdown = window.setInterval(() => {
      setMillisecondsLeft(Math.max(0, 5000 - (Date.now() - startedAt)))
    }, 50)
    const redirect = window.setTimeout(() => navigate('/customerHome'), 5000)

    return () => {
      window.clearInterval(countdown)
      window.clearTimeout(redirect)
    }
  }, [navigate, orderReference])

  useEffect(() => {
    if (copyState !== 'copied') return

    const resetCopyState = window.setTimeout(() => {
      setCopyState('idle')
    }, 1400)

    return () => window.clearTimeout(resetCopyState)
  }, [copyState])

  // Start with the address saved on the customer's profile. They can still
  // change it for this order; the profile itself isn't updated.
  useEffect(() => {
    let cancelled = false

    const loadSavedAddress = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('address')
        .eq('id', user.id)
        .single()

      const saved = (data as { address: string | null } | null)?.address

      // Don't replace anything the customer typed while this was loading.
      if (!cancelled && saved) {
        setAddress((current) => current || saved)
      }
    }

    // Pre-filling is only a convenience, so a failure leaves the box empty.
    loadSavedAddress().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

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
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        throw new Error('Please log in before placing an order.')
      }

      // Create the main order.
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          delivery_address: address.trim(),
          total_amount: total,
          status: 'pending',
        })
        .select('id, order_reference')
        .single()

      if (orderError) throw orderError
      if (!order.order_reference) {
        throw new Error(
          `Order #${order.id} was created, but its reference number was not generated. Configure a database default or trigger for order_reference.`,
        )
      }

      // Save each product belonging to this order.
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw new Error(
          `Order #${order.id} was created, but its items could not be saved. ${itemsError.message}`,
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
          : 'Unable to place your order.',
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

  const copyMessage = copyState === 'copied'
    ? 'Reference number copied.'
    : copyState === 'error'
      ? 'Unable to copy the reference number. Please copy it manually.'
      : ''

  if (showOrderPlaced) {
    return (
      <main className="checkout-confirmation checkout-order-placed" role="status">
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
            aria-label={copyState === 'copied' ? 'Copied' : 'Copy order reference'}
          >
            {copyState === 'copied' ? (
              <svg className="checkout-copy-check" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            ) : (
              'Copy'
            )}
          </button>
        </div>
        <p
          className={copyState === 'error' ? 'checkout-copy-error' : 'checkout-copy-status'}
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
          <span style={{ width: `${(millisecondsLeft / 5000) * 100}%` }} />
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

          {cart.map((item) => (
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

          <label htmlFor="delivery-address">
            Delivery Address
          </label>
          <textarea
            id="delivery-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Enter your complete delivery address"
            required
            rows={3}
          />

          {error && <p role="alert">{error}</p>}

          <button
            type="button"
            onClick={placeOrder}
            disabled={loading || cart.length === 0}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </>
      )}
    </main>
  )
}
