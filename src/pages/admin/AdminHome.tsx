import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUserRole } from '../../lib/api/auth'
import { createProduct } from '../../lib/api/products'
import {
  PRODUCT_LIMITS,
  validateProduct,
  type ProductErrors,
  type ProductInput,
} from '../../lib/validation/product'

const EMPTY: ProductInput = {
  name: '',
  description: '',
  price: '',
  stock: '',
  containerSize: '',
}

type Access = 'checking' | 'signed-out' | 'not-admin' | 'admin'

export default function AdminHome() {
  const [access, setAccess] = useState<Access>('checking')
  const [values, setValues] = useState<ProductInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<ProductErrors>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCurrentUserRole()
      .then((role) => {
        if (cancelled) return
        if (role === null) setAccess('signed-out')
        else setAccess(role === 'admin' ? 'admin' : 'not-admin')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not check your account.')
        setAccess('not-admin')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = e.target.name as keyof ProductInput
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    // Clear a field's error as soon as the user edits it.
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (saving) return

    setError('')
    setMessage('')

    const result = validateProduct(values)
    if (!result.ok) {
      setFieldErrors(result.errors)
      return
    }

    setSaving(true)

    try {
      const product = await createProduct(result.data)
      setValues(EMPTY)
      setMessage(`Added ${product.name}.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add the product.')
    } finally {
      setSaving(false)
    }
  }

  // Shared props for each field's error message and its accessibility wiring.
  const errorProps = (field: keyof ProductInput) => ({
    'aria-invalid': fieldErrors[field] ? true : undefined,
    'aria-describedby': fieldErrors[field] ? `${field}-error` : undefined,
  })

  const fieldError = (field: keyof ProductInput) =>
    fieldErrors[field] && <p id={`${field}-error`}>{fieldErrors[field]}</p>

  if (access === 'checking') {
    return <p>Checking access...</p>
  }

  if (access === 'signed-out') {
    return (
      <section>
        <h1>Admin</h1>
        <p>
          Please <Link to="/login">log in</Link> as an admin to manage products.
        </p>
      </section>
    )
  }

  if (access === 'not-admin') {
    return (
      <section>
        <h1>Admin</h1>
        {error ? <p role="alert">{error}</p> : <p>Only admins can manage products.</p>}
      </section>
    )
  }

  return (
    <section>
      <h1>Admin</h1>

      <h2>Add product</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">Name</label>
          <br />
          <input
            id="name"
            name="name"
            type="text"
            value={values.name}
            onChange={handleChange}
            maxLength={PRODUCT_LIMITS.name.max}
            required
            {...errorProps('name')}
          />
          {fieldError('name')}
        </div>

        <br />

        <div>
          <label htmlFor="description">Description</label>
          <br />
          <textarea
            id="description"
            name="description"
            value={values.description}
            onChange={handleChange}
            maxLength={PRODUCT_LIMITS.description.max}
            {...errorProps('description')}
          />
          {fieldError('description')}
        </div>

        <br />

        <div>
          <label htmlFor="price">Price (₱)</label>
          <br />
          <input
            id="price"
            name="price"
            type="text"
            inputMode="decimal"
            value={values.price}
            onChange={handleChange}
            maxLength={PRODUCT_LIMITS.priceInput.max}
            required
            {...errorProps('price')}
          />
          {fieldError('price')}
        </div>

        <br />

        <div>
          <label htmlFor="stock">Stock</label>
          <br />
          <input
            id="stock"
            name="stock"
            type="text"
            inputMode="numeric"
            value={values.stock}
            onChange={handleChange}
            maxLength={PRODUCT_LIMITS.stockInput.max}
            required
            {...errorProps('stock')}
          />
          {fieldError('stock')}
        </div>

        <br />

        <div>
          <label htmlFor="containerSize">Size</label>
          <br />
          <input
            id="containerSize"
            name="containerSize"
            type="text"
            value={values.containerSize}
            onChange={handleChange}
            maxLength={PRODUCT_LIMITS.containerSize.max}
            required
            {...errorProps('containerSize')}
          />
          {fieldError('containerSize')}
        </div>

        <br />

        <button type="submit" disabled={saving}>
          {saving ? 'Adding...' : 'Add product'}
        </button>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </form>

      <p>
        <Link to="/products">View the catalog</Link>
      </p>
    </section>
  )
}
