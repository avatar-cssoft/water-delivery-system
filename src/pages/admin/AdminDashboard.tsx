import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Product = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  container_size: string
}

function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      setProducts(data || [])
      setLoading(false)
    }

    loadProducts()
  }, [])

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Admin Dashboard</h2>

      <h3>Products</h3>

      <button onClick={() => (window.location.href = '/admin/products')}>
        Add Product
      </button>

      <br />
      <br />

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <p>No products available.</p>
      ) : (
        <table border={1}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Container Size</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.container_size}</td>
                <td>₱{product.price}</td>
                <td>{product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <br />

      <button onClick={() => (window.location.href = '/admin/employees')}>
        Employees
      </button>
    </div>
  )
}

export default AdminDashboard