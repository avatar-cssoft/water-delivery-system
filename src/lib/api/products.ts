import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../supabase'

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

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function formatPrice(price: number): string {
  return pesoFormatter.format(price)
}
