
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getCart, clearCart } from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'
import { appPath } from '../../lib/navigation'

export default function Checkout() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cart = getCart()
  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )

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
    setSuccess('')

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
        .select('id')
        .single()

      if (orderError) throw orderError

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
      setSuccess(`Order #${order.id} placed successfully!`)
      setAddress('')
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

  return (
    <main>
      <h1>Checkout</h1>

      <button
        type="button"
        onClick={() => {
          window.location.href = appPath('/cart')
        }}
      >
        Back to Cart
      </button>

      {cart.length === 0 && !success ? (
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
          {success && <p role="status">{success}</p>}

          {!success && (
            <button
              type="button"
              onClick={placeOrder}
              disabled={loading || cart.length === 0}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          )}
        </>
      )}
    </main>
  )
}
