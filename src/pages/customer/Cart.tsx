
import { useState } from 'react'
import {
  getCart,
  saveCart,
  removeFromCart,
  type CartItem,
} from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>(getCart)

  function updateQuantity(productId: number, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) return

    const updated = items.map((item) =>
      item.product.id === productId
        ? { ...item, quantity }
        : item,
    )

    setItems(updated)
    saveCart(updated)
  }

  function handleRemove(productId: number) {
    removeFromCart(productId)
    setItems(getCart())
  }

  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  )

  return (
    <main>
      <h1>My Cart</h1>

      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {items.map((item) => (
            <article key={item.product.id}>
              <h2>{item.product.name}</h2>
              <p>Price: {formatPrice(item.product.price)}</p>

              <label>
                Quantity:{' '}
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateQuantity(
                      item.product.id,
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              <button
                onClick={() => handleRemove(item.product.id)}
              >
                Remove
              </button>
            </article>
          ))}

          <h2>Total: {formatPrice(total)}</h2>

          <button
            onClick={() => {
              window.location.href = '/checkout'
            }}
          >
            Proceed to Checkout
          </button>
        </>
      )}

      <button
        onClick={() => {
          window.location.href = '/catalog'
        }}
      >
        Continue Shopping
      </button>
    </main>
  )
}
