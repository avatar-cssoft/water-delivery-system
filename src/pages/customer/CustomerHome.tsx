
import { NavLink } from 'react-router-dom'
import gallonImage from '../../assets/images/products/Gallon.png'
import { getCart } from '../../lib/cart'
import { formatPrice } from '../../lib/api/products'

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
      <h1 className="customer-home-title">Customer Home</h1>

      <p>Welcome! What would you like to do today?</p>

      <nav className="customer-home-grid" aria-label="Customer shortcuts">
        <NavLink
          className="customer-home-tile customer-home-tile--browse"
          to="/catalog"
        >
          <span className="customer-home-tile-content">
            <strong>Browse Products</strong>
            <span>Explore available water products.</span>
          </span>
          <img
            className="customer-home-product-image"
            src={gallonImage}
            alt=""
          />
          <span className="customer-home-tile-arrow" aria-hidden="true">›</span>
        </NavLink>

        <NavLink className="customer-home-tile customer-home-tile--cart" to="/cart">
          <span className="customer-home-tile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.5L21 8H6" />
              <circle cx="10" cy="19" r="1" />
              <circle cx="18" cy="19" r="1" />
            </svg>
          </span>
          <span className="customer-home-tile-content">
            <strong>My Cart</strong>
            <span>
              {totalItems === 0
                ? 'Your cart is empty.'
                : `${totalItems} ${totalItems === 1 ? 'item' : 'items'} · ${formatPrice(totalPrice)}`}
            </span>
          </span>
          <span className="customer-home-tile-arrow" aria-hidden="true">›</span>
        </NavLink>

        <NavLink
          className="customer-home-tile customer-home-tile--account"
          to="/account"
        >
          <span className="customer-home-tile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </span>
          <span className="customer-home-tile-content">
            <strong>My Account</strong>
            <span>View your profile and account settings.</span>
          </span>
          <span className="customer-home-tile-arrow" aria-hidden="true">›</span>
        </NavLink>
      </nav>
    </main>
  )
}
