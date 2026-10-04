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

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')

  const [containerSize, setContainerSize] = useState('')
  const [containerUnit, setContainerUnit] = useState('Gallons')

  useEffect(() => {
    getProducts()
  }, [])

  const getProducts = async () => {
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

  const clearForm = () => {
    setName('')
    setDescription('')
    setPrice('')
    setStock('')
    setContainerSize('')
    setContainerUnit('Gallons')
  }

  const startAdd = () => {
    setEditingProduct(null)
    clearForm()
    setShowAddForm(true)
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    clearForm()
  }

  const startEdit = (product: Product) => {
    setShowAddForm(false)
    setEditingProduct(product)

    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price.toString())
    setStock(product.stock.toString())

    // Split "5 Gallons" into "5" and "Gallons"
    const parts = product.container_size.split(' ')

    setContainerSize(parts[0])
    setContainerUnit(parts.slice(1).join(' ') || 'Gallons')
  }

  const cancelEdit = () => {
    setEditingProduct(null)
    clearForm()
  }

  const getContainerSize = () => {
    return `${containerSize} ${containerUnit}`
  }

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase
      .from('products')
      .insert({
        name: name,
        description: description,
        price: Number(price),
        stock: Number(stock),
        container_size: getContainerSize(),
      })

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert('Product added successfully!')

    cancelAdd()
    getProducts()
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingProduct) {
      return
    }

    const { error } = await supabase
      .from('products')
      .update({
        name: name,
        description: description,
        price: Number(price),
        stock: Number(stock),
        container_size: getContainerSize(),
      })
      .eq('id', editingProduct.id)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert('Product updated successfully!')

    cancelEdit()
    getProducts()
  }

  if (loading) {
    return <p>Loading products...</p>
  }

  return (
    <div>
      <h1>Water Delivery System</h1>

      <h2>Products</h2>

      <button onClick={() => (window.location.href = '/admin')}>
        Back to Admin
      </button>

      {' '}

      <button onClick={startAdd}>
        Add Product
      </button>

      <br />
      <br />

      {products.length === 0 ? (
        <p>No products available.</p>
      ) : (
        <table border={1}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Description</th>
              <th>Container Size</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.description}</td>
                <td>{product.container_size}</td>
                <td>₱{product.price}</td>
                <td>{product.stock}</td>

                <td>
                  <button onClick={() => startEdit(product)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddForm && (
        <div>
          <hr />

          <h3>Add Product</h3>

          <form onSubmit={addProduct}>
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
              <label>Container Size</label>
              <br />

              <input
                type="number"
                min="0"
                step="0.01"
                value={containerSize}
                onChange={(e) => setContainerSize(e.target.value)}
                placeholder="Enter size"
                required
              />

              {' '}

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

            <button type="submit">
              Add Product
            </button>

            {' '}

            <button type="button" onClick={cancelAdd}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {editingProduct && (
        <div>
          <hr />

          <h3>Edit Product</h3>

          <form onSubmit={saveProduct}>
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
              <label>Container Size</label>
              <br />

              <input
                type="number"
                min="0"
                step="0.01"
                value={containerSize}
                onChange={(e) => setContainerSize(e.target.value)}
                placeholder="Enter size"
                required
              />

              {' '}

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

            <button type="submit">
              Save Changes
            </button>

            {' '}

            <button type="button" onClick={cancelEdit}>
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Products