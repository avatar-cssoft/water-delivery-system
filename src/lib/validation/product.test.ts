import { describe, expect, it } from 'vitest'
import { validateProduct, type ProductInput } from './product'

const valid: ProductInput = {
  name: 'Round gallon refill',
  description: 'Refill for a 5-gallon round container',
  price: '30',
  stock: '50',
  containerSize: '5 gal',
}

function errorsFor(input: Partial<ProductInput>) {
  const result = validateProduct({ ...valid, ...input })
  return result.ok ? {} : result.errors
}

describe('validateProduct', () => {
  it('accepts a valid product and converts price and stock to numbers', () => {
    expect(validateProduct(valid)).toEqual({
      ok: true,
      data: {
        name: 'Round gallon refill',
        description: 'Refill for a 5-gallon round container',
        price: 30,
        stock: 50,
        containerSize: '5 gal',
      },
    })
  })

  it('trims and collapses whitespace and removes invisible characters', () => {
    const result = validateProduct({
      ...valid,
      name: '  Slim​   gallon  ',
      containerSize: ' 5   gal ',
    })

    expect(result.ok && result.data.name).toBe('Slim gallon')
    expect(result.ok && result.data.containerSize).toBe('5 gal')
  })

  it('stores an empty description as null', () => {
    const result = validateProduct({ ...valid, description: '   ' })

    expect(result.ok && result.data.description).toBeNull()
  })

  it('reports every missing required field', () => {
    const result = validateProduct({
      name: '',
      description: '',
      price: '',
      stock: '',
      containerSize: '',
    })

    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'Product name is required.',
        price: 'Price is required.',
        stock: 'Stock is required.',
        containerSize: 'Size is required.',
      },
    })
  })

  it.each([
    ['<script>alert(1)</script>'],
    ['Refill"; drop table products; --'],
    ['Refill {admin}'],
    ['Refill `x`'],
  ])('rejects unsafe characters in the name: %s', (name) => {
    expect(errorsFor({ name }).name).toMatch(/can only contain/)
  })

  it('rejects unsafe characters in the description', () => {
    expect(errorsFor({ description: '<img src=x onerror=alert(1)>' }).description).toMatch(
      /can only contain/,
    )
  })

  it('rejects a name that is too short or too long', () => {
    expect(errorsFor({ name: 'A' }).name).toMatch(/2 to 100/)
    expect(errorsFor({ name: 'A'.repeat(101) }).name).toMatch(/2 to 100/)
  })

  it('rejects a description over 500 characters', () => {
    expect(errorsFor({ description: 'a'.repeat(501) }).description).toMatch(/at most 500/)
  })

  it.each([
    ['30', 30],
    ['30.5', 30.5],
    ['30.50', 30.5],
    ['1,250.00', 1250],
  ])('accepts the price %s', (price, expected) => {
    const result = validateProduct({ ...valid, price })

    expect(result.ok && result.data.price).toBe(expected)
  })

  it.each([['abc'], ['30.505'], ['-5'], ['1e3'], ['₱30'], ['30 pesos']])(
    'rejects the price %s',
    (price) => {
      expect(errorsFor({ price }).price).toBe('Enter a price in pesos, e.g. 30 or 30.50.')
    },
  )

  it('rejects a price of 0', () => {
    expect(errorsFor({ price: '0' }).price).toBe('Price must be more than 0.')
  })

  it('rejects a price too large for the database', () => {
    expect(errorsFor({ price: '100000000' }).price).toBe('Price is too high.')
  })

  it('accepts a stock of 0 (out of stock)', () => {
    const result = validateProduct({ ...valid, stock: '0' })

    expect(result.ok && result.data.stock).toBe(0)
  })

  it.each([['-1'], ['2.5'], ['ten']])('rejects the stock %s', (stock) => {
    expect(errorsFor({ stock }).stock).toBe('Stock must be a whole number, 0 or more.')
  })

  it('rejects an unrealistically large stock', () => {
    expect(errorsFor({ stock: '1000001' }).stock).toMatch(/at most/)
  })

  it('rejects unsafe characters in the size', () => {
    expect(errorsFor({ containerSize: '5 gal; drop' }).containerSize).toMatch(/can only contain/)
  })
})
