import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  applyProductChange,
  createProduct,
  formatPrice,
  getProducts,
  subscribeToProducts,
  toProduct,
  type ProductChange,
  type ProductRow,
} from './products'

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

describe('createProduct', () => {
  function fakeInsertClient(result: {
    data: ProductRow | null
    error: { message: string; code?: string } | null
  }) {
    const single = vi.fn().mockResolvedValue(result)
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const from = vi.fn(() => ({ insert }))

    return { client: { from } as unknown as SupabaseClient, from, insert }
  }

  const newProduct = {
    name: 'Round gallon refill',
    description: '5-gallon round container refill',
    price: 30,
    stock: 12,
    containerSize: '5 gal',
  }

  it('inserts the product using the table column names', async () => {
    const { client, from, insert } = fakeInsertClient({ data: roundGallon, error: null })

    await createProduct(newProduct, client)

    expect(from).toHaveBeenCalledWith('products')
    expect(insert).toHaveBeenCalledWith({
      name: 'Round gallon refill',
      description: '5-gallon round container refill',
      price: 30,
      stock: 12,
      container_size: '5 gal',
    })
  })

  it('returns the saved product', async () => {
    const { client } = fakeInsertClient({ data: roundGallon, error: null })

    await expect(createProduct(newProduct, client)).resolves.toMatchObject({
      id: 1,
      price: 30,
      available: true,
    })
  })

  it('explains when the database blocks a non-admin', async () => {
    const { client } = fakeInsertClient({
      data: null,
      error: { message: 'new row violates row-level security policy', code: '42501' },
    })

    await expect(createProduct(newProduct, client)).rejects.toThrow('Only admins can add products.')
  })

  it('throws other Supabase errors as they are', async () => {
    const { client } = fakeInsertClient({
      data: null,
      error: { message: 'violates check constraint "products_price_positive"', code: '23514' },
    })

    await expect(createProduct(newProduct, client)).rejects.toThrow('products_price_positive')
  })
})

describe('subscribeToProducts', () => {
  type Payload = { eventType: string; new: Partial<ProductRow>; old: Partial<ProductRow> }

  function fakeRealtimeClient() {
    let handler: (payload: Payload) => void = () => {}
    const channel = {
      on: vi.fn((_type: string, _filter: unknown, callback: (payload: Payload) => void) => {
        handler = callback
        return channel
      }),
      subscribe: vi.fn(() => channel),
    }
    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    }

    return {
      client: client as unknown as SupabaseClient,
      raw: client,
      channel,
      emit: (payload: Payload) => handler(payload),
    }
  }

  it('listens to all changes on public.products', () => {
    const { client, channel } = fakeRealtimeClient()

    subscribeToProducts(() => {}, client)

    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      expect.any(Function),
    )
    expect(channel.subscribe).toHaveBeenCalled()
  })

  it('reports inserts and updates as products with availability', () => {
    const { client, emit } = fakeRealtimeClient()
    const changes: ProductChange[] = []
    subscribeToProducts((change) => changes.push(change), client)

    emit({ eventType: 'INSERT', new: roundGallon, old: {} })
    emit({ eventType: 'UPDATE', new: { ...roundGallon, stock: 0 }, old: { id: 1 } })

    expect(changes).toEqual([
      { type: 'upsert', product: toProduct(roundGallon) },
      { type: 'upsert', product: { ...toProduct(roundGallon), stock: 0, available: false } },
    ])
  })

  it('reports deletes by id', () => {
    const { client, emit } = fakeRealtimeClient()
    const changes: ProductChange[] = []
    subscribeToProducts((change) => changes.push(change), client)

    emit({ eventType: 'DELETE', new: {}, old: { id: 2 } })

    expect(changes).toEqual([{ type: 'delete', id: 2 }])
  })

  it('removes the channel when unsubscribed', () => {
    const { client, raw, channel } = fakeRealtimeClient()

    const unsubscribe = subscribeToProducts(() => {}, client)
    unsubscribe()

    expect(raw.removeChannel).toHaveBeenCalledWith(channel)
  })
})

describe('applyProductChange', () => {
  const round = toProduct(roundGallon)
  const slim = toProduct(slimGallon)

  it('adds a new product in name order', () => {
    const added = toProduct({ ...slimGallon, id: 3, name: 'New container' })

    expect(applyProductChange([round, slim], { type: 'upsert', product: added })).toEqual([
      added,
      round,
      slim,
    ])
  })

  it('replaces an edited product instead of adding a copy', () => {
    const edited = { ...slim, stock: 4, available: true }

    expect(applyProductChange([round, slim], { type: 'upsert', product: edited })).toEqual([
      round,
      edited,
    ])
  })

  it('removes a deleted product', () => {
    expect(applyProductChange([round, slim], { type: 'delete', id: 1 })).toEqual([slim])
  })

  it('ignores a delete for a product that is not in the list', () => {
    expect(applyProductChange([round], { type: 'delete', id: 99 })).toEqual([round])
  })
})
