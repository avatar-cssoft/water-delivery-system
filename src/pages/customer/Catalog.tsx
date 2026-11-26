import { useEffect, useState } from 'react'
import {
  getProducts,
  subscribeToProducts,
  applyProductChange,
  formatPrice,
  type Product,
  type ProductChange,
} from '../../lib/api/products'
import { addToCart, getCart } from '../../lib/cart'
import { appPath } from '../../lib/navigation'

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cartCount = getCart().reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    let active = true
    const pendingChanges: ProductChange[] = []
    const loadingRef = { current: true }

    const subscription = subscribeToProducts((change) => {
      if (!active) return

      if (loadingRef.current) {
        pendingChanges.push(change)
      } else {
        setProducts((current) =>
          applyProductChange(current, change),
        )
      }
    })

    async function loadProducts() {
      try {
        const result = await getProducts()

        if (!active) return

        const updated = pendingChanges.reduce(
          (current, change) =>
            applyProductChange(current, change),
          result,
        )

        setProducts(updated)
        setError(null)
      } catch {
        if (active) {
          setError('Unable to load products. Please try again.')
        }
      } finally {
        loadingRef.current = false

        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProducts()

    return () => {
      active = false
      subscription()
    }
  }, [])

  function handleAddToCart(product: Product) {
    addToCart(product)
    window.location.href = appPath('/cart')
  }

  return (
    <main>
      <div className="catalog-header">
        <h1>Shop Water Products</h1>
        <a
          className="catalog-cart-link"
          href={appPath('/cart')}
          aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 1.9-1.5L21 8H6" />
            <circle cx="10" cy="19" r="1" />
            <circle cx="18" cy="19" r="1" />
          </svg>
          <span className="catalog-cart-count" aria-hidden="true">
            {cartCount}
          </span>
        </a>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : error ? (
        <p role="alert">
          {error}
        </p>
      ) : products.length === 0 ? (
        <p>No products available yet.</p>
      ) : (
        <div className="product-list">
          {products.map((product) => (
            <article key={product.id}>
              <h2>{product.name}</h2>

              <p>Size: {product.containerSize}</p>

              {product.description && (
                <p>{product.description}</p>
              )}

              <p>Price: {formatPrice(product.price)}</p>

              <p>Stock: {product.stock}</p>

              <button
                type="button"
                disabled={
                  !product.available || product.stock <= 0
                }
                onClick={() => handleAddToCart(product)}
              >
                Add to Cart
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
