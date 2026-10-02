// Sanitizing and validation for the registration form. Kept free of React and
// browser APIs so a server-side check (Edge Function) can reuse it later.
// Client-side checks are for the user's benefit only: the server must run them again.

export type RegisterInput = {
  firstName: string
  lastName: string
  middleInitial: string
  phone: string
  address: string
  email: string
  password: string
}

export type RegisterData = Omit<RegisterInput, 'middleInitial'> & {
  middleInitial: string | null
}

export type RegisterErrors = Partial<Record<keyof RegisterInput, string>>

export type RegisterResult =
  | { ok: true; data: RegisterData }
  | { ok: false; errors: RegisterErrors }

export const LIMITS = {
  name: { min: 1, max: 50 },
  // One or two letters, plus an optional trailing period ("M.").
  middleInitial: { max: 3 },
  address: { min: 10, max: 255 },
  // Longest accepted mobile spelling: "+63 912 345 6789" plus some extra spacing.
  phone: { max: 20 },
  email: { max: 254 },
  // Supabase Auth requires at least 6; bcrypt ignores anything past 72 bytes.
  password: { min: 6, max: 72 },
} as const

// Control characters, zero-width characters, and bidi overrides. They are invisible,
// can hide or reorder text, and have no place in a name, address, or phone number.
const INVISIBLE_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu

// Letters (any language), combining marks, spaces, and the punctuation that real
// names use: O'Brien, Dela Cruz-Santos, Ma. Teresa.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u

const MIDDLE_INITIAL_PATTERN = /^\p{L}{1,2}\.?$/u

// Letters, digits, spaces, and the punctuation used in addresses:
// "Unit 4B, #12 Magsaysay Ave., Brgy. Session Rd. (near UB), Baguio City".
// Anything else, including < > " ` ; = { } \, is rejected.
const ADDRESS_PATTERN = /^[\p{L}\p{M}\p{N} .,#'()/&-]+$/u

// Philippine mobile numbers: 09XXXXXXXXX, 639XXXXXXXXX, or +639XXXXXXXXX.
const MOBILE_PATTERN = /^(?:\+?63|0)(9\d{9})$/

// Deliberately loose: one @, no spaces, a dot in the domain. Supabase Auth does the
// real check when it sends the confirmation email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Normalizes Unicode, removes invisible characters, and collapses whitespace. */
export function sanitizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(INVISIBLE_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Returns the number in E.164 form (+639XXXXXXXXX), or null if it is not a PH mobile number. */
export function normalizeMobile(value: string): string | null {
  const compact = sanitizeText(value).replace(/[\s().-]/g, '')
  const match = MOBILE_PATTERN.exec(compact)
  return match ? `+63${match[1]}` : null
}

function validateName(value: string, label: string): { value: string; error?: string } {
  const name = sanitizeText(value)
  if (!name) return { value: name, error: `${label} is required.` }
  if (name.length > LIMITS.name.max) {
    return { value: name, error: `${label} must be at most ${LIMITS.name.max} characters.` }
  }
  if (!NAME_PATTERN.test(name)) {
    return { value: name, error: `${label} can only contain letters, spaces, and . ' -` }
  }
  return { value: name }
}

export function validateRegister(input: RegisterInput): RegisterResult {
  const errors: RegisterErrors = {}

  const firstName = validateName(input.firstName, 'First name')
  if (firstName.error) errors.firstName = firstName.error

  const lastName = validateName(input.lastName, 'Last name')
  if (lastName.error) errors.lastName = lastName.error

  // Optional. Stored as uppercase letters without the period, or null.
  const rawInitial = sanitizeText(input.middleInitial)
  let middleInitial: string | null = null
  if (rawInitial) {
    if (!MIDDLE_INITIAL_PATTERN.test(rawInitial)) {
      errors.middleInitial = 'Middle initial must be 1 or 2 letters.'
    } else {
      middleInitial = rawInitial.replace('.', '').toUpperCase()
    }
  }

  const rawPhone = sanitizeText(input.phone)
  const phone = normalizeMobile(rawPhone)
  if (!rawPhone) {
    errors.phone = 'Mobile number is required.'
  } else if (rawPhone.length > LIMITS.phone.max || !phone) {
    errors.phone = 'Enter a valid PH mobile number, e.g. 0912 345 6789.'
  }

  const address = sanitizeText(input.address)
  if (!address) {
    errors.address = 'Address is required.'
  } else if (address.length < LIMITS.address.min || address.length > LIMITS.address.max) {
    errors.address = `Address must be ${LIMITS.address.min} to ${LIMITS.address.max} characters.`
  } else if (!ADDRESS_PATTERN.test(address)) {
    errors.address = "Address can only contain letters, numbers, spaces, and . , # ' ( ) / & -"
  }

  const email = sanitizeText(input.email).toLowerCase()
  if (!email) {
    errors.email = 'Email is required.'
  } else if (email.length > LIMITS.email.max || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  // Passwords are never sanitized or trimmed: every character is the user's choice.
  const password = input.password
  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < LIMITS.password.min) {
    errors.password = `Password must be at least ${LIMITS.password.min} characters.`
  } else if (new TextEncoder().encode(password).length > LIMITS.password.max) {
    errors.password = 'Password is too long.'
  }

  if (Object.keys(errors).length > 0 || !phone) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    data: {
      firstName: firstName.value,
      lastName: lastName.value,
      middleInitial,
      phone,
      address,
      email,
      password,
    },
  }
}
