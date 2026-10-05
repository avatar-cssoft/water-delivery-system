// Sanitizing and validation for the admin "Add product" form. Like register.ts, it
// has no React or browser dependencies. The database also enforces price > 0 and
// stock >= 0 (see the products migration), because the form can be bypassed.

import { sanitizeText } from './register'

export type ProductInput = {
  name: string
  description: string
  price: string
  stock: string
  containerSize: string
}

export type NewProduct = {
  name: string
  description: string | null
  price: number
  stock: number
  containerSize: string
}

export type ProductErrors = Partial<Record<keyof ProductInput, string>>

export type ProductResult =
  | { ok: true; data: NewProduct }
  | { ok: false; errors: ProductErrors }

export const PRODUCT_LIMITS = {
  name: { min: 2, max: 100 },
  description: { max: 500 },
  // products.price is numeric(10,2).
  price: { max: 99_999_999.99 },
  // Typed length of the price field, e.g. "99,999,999.99".
  priceInput: { max: 15 },
  // products.stock is an integer; a million is far beyond any real stock count.
  stock: { max: 1_000_000 },
  stockInput: { max: 9 },
  containerSize: { min: 1, max: 30 },
} as const

// Letters, digits, spaces, and punctuation used in product names and descriptions:
// "Round gallon (5 gal) refill", "Slim container w/ cap & seal". Anything else,
// including < > " ` ; = { } \, is rejected.
const TEXT_PATTERN = /^[\p{L}\p{M}\p{N} .,#'()/&+%:-]+$/u
const TEXT_CHARS = ". , # ' ( ) / & + % : -"

// Sizes such as "5 gal", "Slim 5 gal", "500 mL", "1.5 L".
const SIZE_PATTERN = /^[\p{L}\p{M}\p{N} ./()-]+$/u

// Whole pesos or pesos and centavos: "30", "30.5", "1,250.00".
const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/

const STOCK_PATTERN = /^\d+$/

export function validateProduct(input: ProductInput): ProductResult {
  const errors: ProductErrors = {}

  const name = sanitizeText(input.name)
  if (!name) {
    errors.name = 'Product name is required.'
  } else if (name.length < PRODUCT_LIMITS.name.min || name.length > PRODUCT_LIMITS.name.max) {
    errors.name = `Product name must be ${PRODUCT_LIMITS.name.min} to ${PRODUCT_LIMITS.name.max} characters.`
  } else if (!TEXT_PATTERN.test(name)) {
    errors.name = `Product name can only contain letters, numbers, spaces, and ${TEXT_CHARS}`
  }

  // Optional. Stored as null when empty.
  const description = sanitizeText(input.description)
  if (description.length > PRODUCT_LIMITS.description.max) {
    errors.description = `Description must be at most ${PRODUCT_LIMITS.description.max} characters.`
  } else if (description && !TEXT_PATTERN.test(description)) {
    errors.description = `Description can only contain letters, numbers, spaces, and ${TEXT_CHARS}`
  }

  // Thousands separators are allowed while typing and removed before parsing.
  const rawPrice = sanitizeText(input.price).replace(/,/g, '')
  const price = Number(rawPrice)
  if (!rawPrice) {
    errors.price = 'Price is required.'
  } else if (!PRICE_PATTERN.test(rawPrice)) {
    errors.price = 'Enter a price in pesos, e.g. 30 or 30.50.'
  } else if (price <= 0) {
    errors.price = 'Price must be more than 0.'
  } else if (price > PRODUCT_LIMITS.price.max) {
    errors.price = 'Price is too high.'
  }

  const rawStock = sanitizeText(input.stock).replace(/,/g, '')
  const stock = Number(rawStock)
  if (!rawStock) {
    errors.stock = 'Stock is required.'
  } else if (!STOCK_PATTERN.test(rawStock)) {
    errors.stock = 'Stock must be a whole number, 0 or more.'
  } else if (stock > PRODUCT_LIMITS.stock.max) {
    errors.stock = `Stock must be at most ${PRODUCT_LIMITS.stock.max.toLocaleString('en-PH')}.`
  }

  const containerSize = sanitizeText(input.containerSize)
  if (!containerSize) {
    errors.containerSize = 'Size is required.'
  } else if (containerSize.length > PRODUCT_LIMITS.containerSize.max) {
    errors.containerSize = `Size must be at most ${PRODUCT_LIMITS.containerSize.max} characters.`
  } else if (!SIZE_PATTERN.test(containerSize)) {
    errors.containerSize = 'Size can only contain letters, numbers, spaces, and . / ( ) -'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    data: {
      name,
      description: description || null,
      price,
      stock,
      containerSize,
    },
  }
}
