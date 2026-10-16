
import { useEffect, useState } from 'react'
import {
  getProducts,
  subscribeToProducts,
  applyProductChange,
  formatPrice,
  type Product,
  type ProductChange,
} from '../../lib/api/products'
import { addToCart } from '../../lib/cart'
import { navigateTo } from '../../lib/navigation'

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  function goToCustomerHome() {
    navigateTo('/customerHome')
  }

  function goToCart() {
    navigateTo('/cart')
  }

  function handleAddToCart(product: Product) {
    addToCart(product)
    navigateTo('/cart')
  }

  return (
    <main>
      <h1>Shop Water Products</h1>

      <nav>
        <button type="button" onClick={goToCustomerHome}>
          Back to Customer Home
        </button>

        <button type="button" onClick={goToCart}>
          View Cart
        </button>
      </nav>

      {loading ? (
        <p>Loading products...</p>
      ) : error ? (
        <p role="alert">{error}</p>
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
                disabled={!product.available || product.stock <= 0}
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
