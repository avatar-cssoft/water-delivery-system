import { normalizeMobile, sanitizeText, validateName } from './register'

export type SavedAddressInput = {
  recipient_name: string
  phone: string
  address_line: string
  barangay: string
  city: string
  province: string
  postal_code: string
}

export type SavedAddressData = Omit<SavedAddressInput, 'phone'> & {
  phone: string
}

export type SavedAddressValidation =
  | { ok: true; data: SavedAddressData }
  | { ok: false; error: string }

const ADDRESS_FIELDS = [
  ['address_line', 'Street / House Number', 255],
  ['barangay', 'Barangay', 100],
  ['city', 'City / Municipality', 100],
  ['province', 'Province', 100],
] as const

export function validateSavedAddress(
  input: SavedAddressInput,
): SavedAddressValidation {
  const recipient = validateName(input.recipient_name, 'Recipient name')
  if (recipient.error) return { ok: false, error: recipient.error }

  const phone = normalizeMobile(input.phone)
  if (!phone) {
    return {
      ok: false,
      error: 'Enter a valid Philippine mobile number, such as +639123456789.',
    }
  }

  const data = {} as Pick<SavedAddressInput, (typeof ADDRESS_FIELDS)[number][0]>
  for (const [field, label, maxLength] of ADDRESS_FIELDS) {
    const value = sanitizeText(input[field])
    if (!value) return { ok: false, error: `${label} is required.` }
    if (value.length > maxLength) {
      return {
        ok: false,
        error: `${label} must be at most ${maxLength} characters.`,
      }
    }
    data[field] = value
  }

  const postalCode = sanitizeText(input.postal_code)
  if (postalCode && !/^\d{4}$/.test(postalCode)) {
    return { ok: false, error: 'Postal code must be exactly 4 digits.' }
  }

  return {
    ok: true,
    data: {
      recipient_name: recipient.value,
      phone,
      ...data,
      postal_code: postalCode,
    },
  }
}
