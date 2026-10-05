import { useEffect, useState } from 'react'
import {
  applyProductChange,
  formatPrice,
  getProducts,
  subscribeToProducts,
  type Product,
  type ProductChange,
} from '../../lib/api/products'

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let loaded = false
    // Changes that arrive before the first load finishes. They are applied on top
    // of the loaded list, so a change is never lost to an older snapshot.
    let pending: ProductChange[] = []

    // Live updates: products added, edited, or deleted elsewhere show up here.
    const unsubscribe = subscribeToProducts((change) => {
      if (cancelled) return
      if (loaded) {
        setProducts((current) => applyProductChange(current, change))
      } else {
        pending.push(change)
      }
    })

    getProducts()
      .then((data) => {
        if (cancelled) return
        setProducts(pending.reduce(applyProductChange, data))
        pending = []
        loaded = true
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load products.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (loading) {
    return <p>Loading products...</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return (
    <section>
      <h1>Products</h1>

      {products.length === 0 ? (
        <p>No products available yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Size</th>
              <th scope="col">Price</th>
              <th scope="col">Availability</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.name}
                  {product.description && (
                    <>
                      <br />
                      <small>{product.description}</small>
                    </>
                  )}
                </td>
                <td>{product.containerSize}</td>
                <td>{formatPrice(product.price)}</td>
                <td>{product.available ? 'In stock' : 'Out of stock'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
