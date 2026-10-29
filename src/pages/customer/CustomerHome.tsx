
import { getCart } from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'
import { appPath } from '../../lib/navigation'

export default function CustomerHome() {
  const cart = getCart()

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  )

  const totalPrice = cart.reduce(
    (sum, item) =>
      sum + item.product.price * item.quantity,
    0,
  )

  return (
    <main>
      <h1>Water Delivery System</h1>
      <h2>Customer Home</h2>

      <p>Welcome! What would you like to do today?</p>

      <section>
        <h3>Shop Water Products</h3>
        <p>Browse our available water products.</p>

        <button
          type="button"
          onClick={() => {
            window.location.href = appPath('/catalog')
          }}
        >
          Browse Products
        </button>
      </section>

      <section>
        <h3>My Cart</h3>

        <p>
          Items in cart: {totalItems}
        </p>

        <p>
          Cart total: {formatPrice(totalPrice)}
        </p>

        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul>
            {cart.map((item) => (
              <li key={item.product.id}>
                {item.product.name} × {item.quantity}
                {' — '}
                {formatPrice(
                  item.product.price * item.quantity,
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.href = appPath('/cart')
          }}
        >
          View My Cart
        </button>
      </section>

      <button
        type="button"
        onClick={() => {
          window.location.href = appPath('/account')
        }}
      >
        My Account
      </button>
    </main>
  )
}
