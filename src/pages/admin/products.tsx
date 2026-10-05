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

function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [containerAmount, setContainerAmount] = useState('')
  const [containerUnit, setContainerUnit] = useState('Gallons')

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)

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

  const getProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setProducts(data || [])
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setPrice('')
    setStock('')
    setContainerAmount('')
    setContainerUnit('Gallons')
    setEditingProduct(null)
    setShowForm(false)
  }

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    const containerSize = `${containerAmount} ${containerUnit}`

    const { error } = await supabase.from('products').insert({
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      stock: Number(stock),
      container_size: containerSize,
    })

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert('Product added successfully.')

    await getProducts()
    resetForm()
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)

    setName(product.name)
    setDescription(product.description || '')
    setPrice(String(product.price))
    setStock(String(product.stock))

    const parts = product.container_size.split(' ')

    if (parts.length >= 2) {
      setContainerAmount(parts[0])
      setContainerUnit(parts.slice(1).join(' '))
    } else {
      setContainerAmount(product.container_size)
      setContainerUnit('Gallons')
    }

    setShowForm(true)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingProduct) {
      return
    }

    const containerSize = `${containerAmount} ${containerUnit}`

    const { error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        stock: Number(stock),
        container_size: containerSize,
      })
      .eq('id', editingProduct.id)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert('Product updated successfully.')

    await getProducts()
    resetForm()
  }

  const deleteProduct = async (id: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?',
    )

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert('Product deleted successfully.')

    await getProducts()
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Products</h2>

      <button onClick={() => (window.location.href = '/admin')}>
        Back to Admin Dashboard
      </button>

      <br />
      <br />

      <button
        onClick={() => {
          if (showForm) {
            resetForm()
          } else {
            setShowForm(true)
          }
        }}
      >
        {showForm ? 'Cancel' : 'Add Product'}
      </button>

      <br />
      <br />

      {showForm && (
        <form onSubmit={editingProduct ? saveProduct : addProduct}>
          <h3>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>

          <div>
            <label>Product Name</label>
            <br />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <br />

          <div>
            <label>Description</label>
            <br />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <br />

          <div>
            <label>Price</label>
            <br />
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <br />

          <div>
            <label>Stock</label>
            <br />
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>

          <br />

          <div>
            <label>Container Size</label>
            <br />

            <input
              type="number"
              min="0"
              step="0.01"
              value={containerAmount}
              onChange={(e) => setContainerAmount(e.target.value)}
              required
            />

            <select
              value={containerUnit}
              onChange={(e) => setContainerUnit(e.target.value)}
            >
              <option value="Gallons">Gallons</option>
              <option value="Liters">Liters</option>
              <option value="Milliliters">Milliliters</option>
            </select>
          </div>

          <br />

          <button type="submit">
            {editingProduct ? 'Save Changes' : 'Add Product'}
          </button>

          {editingProduct && (
            <button type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </form>
      )}

      <hr />

      <h3>Product List</h3>

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <p>No products available.</p>
      ) : (
        <table border={1}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Description</th>
              <th>Container Size</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.description || 'No description'}</td>
                <td>{product.container_size}</td>
                <td>₱{Number(product.price).toFixed(2)}</td>
                <td>{product.stock}</td>
                <td>
                  <button onClick={() => startEdit(product)}>
                    Edit
                  </button>

                  {' '}

                  <button onClick={() => deleteProduct(product.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Products