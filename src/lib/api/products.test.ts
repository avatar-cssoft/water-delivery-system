import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { formatPrice, getProducts, toProduct, type ProductRow } from './products'

vi.mock('../supabase', () => ({ supabase: {} }))

const roundGallon: ProductRow = {
  id: 1,
  name: 'Round gallon refill',
  description: '5-gallon round container refill',
  price: '30.00',
  stock: 12,
  container_size: '5 gal',
}

const slimGallon: ProductRow = {
  id: 2,
  name: 'Slim gallon refill',
  description: null,
  price: 35,
  stock: 0,
  container_size: '5 gal',
}

function fakeClient(result: { data: ProductRow[] | null; error: { message: string } | null }) {
  const order = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ order }))
  const from = vi.fn(() => ({ select }))

  return { client: { from } as unknown as SupabaseClient, from, select, order }
}

describe('toProduct', () => {
  it('converts a numeric string price to a number', () => {
    expect(toProduct(roundGallon).price).toBe(30)
  })

  it('marks products with stock as available', () => {
    expect(toProduct(roundGallon).available).toBe(true)
  })

  it('marks products with no stock as unavailable', () => {
    expect(toProduct(slimGallon).available).toBe(false)
  })

  it('treats negative stock as unavailable', () => {
    expect(toProduct({ ...roundGallon, stock: -1 }).available).toBe(false)
  })
})

describe('getProducts', () => {
  it('selects name, price and stock from the products table, ordered by name', async () => {
    const { client, from, select, order } = fakeClient({ data: [], error: null })

    await getProducts(client)

    expect(from).toHaveBeenCalledWith('products')
    expect(select).toHaveBeenCalledWith(expect.stringContaining('name'))
    expect(select).toHaveBeenCalledWith(expect.stringContaining('price'))
    expect(select).toHaveBeenCalledWith(expect.stringContaining('stock'))
    expect(order).toHaveBeenCalledWith('name')
  })

  it('returns products with price and availability', async () => {
    const { client } = fakeClient({ data: [roundGallon, slimGallon], error: null })

    const products = await getProducts(client)

    expect(products).toEqual([
      {
        id: 1,
        name: 'Round gallon refill',
        description: '5-gallon round container refill',
        price: 30,
        stock: 12,
        containerSize: '5 gal',
        available: true,
      },
      {
        id: 2,
        name: 'Slim gallon refill',
        description: null,
        price: 35,
        stock: 0,
        containerSize: '5 gal',
        available: false,
      },
    ])
  })

  it('returns an empty list when there is no data', async () => {
    const { client } = fakeClient({ data: null, error: null })

    await expect(getProducts(client)).resolves.toEqual([])
  })

  it('throws the Supabase error message', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'permission denied' } })

    await expect(getProducts(client)).rejects.toThrow('permission denied')
  })
})

describe('formatPrice', () => {
  it('formats prices in Philippine pesos', () => {
    expect(formatPrice(30)).toBe('₱30.00')
  })
})
