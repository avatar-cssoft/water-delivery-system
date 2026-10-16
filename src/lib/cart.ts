
import type { Product } from './api/products'

export type CartItem = {
  product: Product
  quantity: number
}

const CART_KEY = 'water_delivery_cart'

export function getCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_KEY)

    return saved ? (JSON.parse(saved) as CartItem[]) : []
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function addToCart(product: Product): void {
  const cart = getCart()

  const existingItem = cart.find(
    (item) => item.product.id === product.id,
  )

  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({
      product,
      quantity: 1,
    })
  }

  saveCart(cart)
}

export function removeFromCart(productId: number): void {
  const cart = getCart().filter(
    (item) => item.product.id !== productId,
  )

  saveCart(cart)
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
}
