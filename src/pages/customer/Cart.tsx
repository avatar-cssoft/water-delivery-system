
import { useState } from 'react'
import {
  getCart,
  saveCart,
  removeFromCart,
  type CartItem,
} from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'
import { appPath } from '../../lib/navigation'

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
    <main className="cart-page">
      <h1>My Cart</h1>

      {items.length === 0 ? (
        <p className="cart-empty">Your cart is empty.</p>
      ) : (
        <>
          <div className="cart-items">
            {items.map((item) => (
              <article className="cart-item" key={item.product.id}>
                <div className="cart-item-info">
                  <h2>{item.product.name}</h2>
                  <p>Size: {item.product.containerSize}</p>
                  <p>Price: {formatPrice(item.product.price)}</p>
                </div>

                <label className="cart-quantity">
                  Quantity
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
                  className="cart-remove"
                  type="button"
                  onClick={() => handleRemove(item.product.id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>

          <section className="cart-summary" aria-label="Cart summary">
            <h2>Total: {formatPrice(total)}</h2>
            <div className="cart-actions">
              <button
                type="button"
                onClick={() => {
                  window.location.href = appPath('/checkout')
                }}
              >
                Proceed to Checkout
              </button>
              <button
                className="cart-continue"
                type="button"
                onClick={() => {
                  window.location.href = appPath('/catalog')
                }}
              >
                Continue Shopping
              </button>
            </div>
          </section>
        </>
      )}

      {items.length === 0 && (
        <button
          className="cart-continue"
          type="button"
          onClick={() => {
            window.location.href = appPath('/catalog')
          }}
        >
          Continue Shopping
        </button>
      )}
    </main>
  )
}
