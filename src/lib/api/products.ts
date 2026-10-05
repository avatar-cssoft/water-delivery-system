import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { NewProduct } from '../validation/product'

// Row shape of public.products (supabase/migrations/water_project.sql).
// PostgREST can return numeric(10,2) as a number or a string.
export type ProductRow = {
  id: number
  name: string
  description: string | null
  price: number | string
  stock: number
  container_size: string
}

export type Product = {
  id: number
  name: string
  description: string | null
  price: number
  stock: number
  containerSize: string
  available: boolean
}

const PRODUCT_COLUMNS = 'id, name, description, price, stock, container_size'

export function toProduct(row: ProductRow): Product {
  const stock = Number(row.stock) || 0

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock,
    containerSize: row.container_size,
    available: stock > 0,
  }
}

export async function getProducts(
  client: SupabaseClient = supabase,
): Promise<Product[]> {
  const { data, error } = await client
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => toProduct(row as ProductRow))
}

// Postgres error raised when a row-level security policy blocks a write.
const RLS_VIOLATION = '42501'

export async function createProduct(
  product: NewProduct,
  client: SupabaseClient = supabase,
): Promise<Product> {
  const { data, error } = await client
    .from('products')
    .insert({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      container_size: product.containerSize,
    })
    .select(PRODUCT_COLUMNS)
    .single()

  if (error) {
    if (error.code === RLS_VIOLATION) {
      throw new Error('Only admins can add products.')
    }
    throw new Error(error.message)
  }

  return toProduct(data as ProductRow)
}

export type ProductChange =
  | { type: 'upsert'; product: Product }
  | { type: 'delete'; id: number }

/**
 * Calls onChange whenever a product is added, edited, or deleted, using Supabase
 * Realtime. The products table must be in the supabase_realtime publication.
 * Returns a function that stops listening.
 */
export function subscribeToProducts(
  onChange: (change: ProductChange) => void,
  client: SupabaseClient = supabase,
): () => void {
  const channel = client
    .channel('public:products')
    .on<ProductRow>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          if (payload.old.id !== undefined) {
            onChange({ type: 'delete', id: payload.old.id })
          }
        } else {
          onChange({ type: 'upsert', product: toProduct(payload.new) })
        }
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

/** Applies a realtime change to a product list, keeping it sorted by name like getProducts. */
export function applyProductChange(products: Product[], change: ProductChange): Product[] {
  if (change.type === 'delete') {
    return products.filter((product) => product.id !== change.id)
  }

  return [...products.filter((product) => product.id !== change.product.id), change.product].sort(
    (a, b) => a.name.localeCompare(b.name),
  )
}

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatPrice(price: number): string {
  return pesoFormatter.format(price)
}
