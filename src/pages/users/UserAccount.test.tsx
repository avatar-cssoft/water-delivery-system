import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserAccounts from './UserAccount'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
}))

vi.mock('../../lib/supabase', () => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    single: mocks.single,
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)

  return {
    supabase: {
      from: vi.fn(() => query),
      auth: { getUser: mocks.getUser },
    },
  }
})

const profile = {
  id: 'user-id',
  first_name: 'Jane',
  middle_initial: 'B',
  last_name: 'Doe',
  address: '1 Old Street',
  phone: '09993053242',
  role: 'user',
}

describe('UserAccounts profile editing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: { user: { id: profile.id } },
      error: null,
    })
    mocks.single.mockResolvedValue({ data: profile, error: null })
  })

  it('shows profile inputs and actions below the edit form without saving edits', async () => {
    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    expect(screen.getByText(/Middle Initial:/)).toBeInTheDocument()
    expect(screen.getByText(/Last Name:/)).toBeInTheDocument()
    expect(screen.getByText(/0999 305 3242/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Address Logbook' })).toHaveAttribute(
      'href',
      '/account/address-logbook',
    )

    expect(screen.getByLabelText('First Name')).toHaveValue('Jane')
    expect(screen.getByLabelText('Middle Initial')).toHaveValue('B')
    expect(screen.getByLabelText('Middle Initial')).toHaveAttribute('maxLength', '3')
    expect(screen.getByLabelText('Last Name')).toHaveValue('Doe')
    expect(screen.getByLabelText('Phone')).toHaveValue('09993053242')
    expect(screen.getByLabelText('Primary Address')).toHaveValue('1 Old Street')
    expect(screen.getByLabelText('Primary Address')).toHaveAttribute('readonly')
    expect(
      screen.getByRole('form', { name: 'Edit profile' }).compareDocumentPosition(
        screen.getByRole('button', { name: 'Discard' }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    expect(screen.queryByRole('link', { name: 'Address Logbook' })).not.toBeInTheDocument()
    expect(screen.getByText('Save changes to open Address Logbook')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Saving changes is not available yet.',
    )
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Middle Initial'), {
      target: { value: 'AB.' },
    })
    expect(screen.getByLabelText('Middle Initial')).toHaveValue('AB.')

    fireEvent.change(screen.getByLabelText('Middle Initial'), {
      target: { value: 'A1' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter one or two letters for the middle initial.',
    )
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    })
    fireEvent.change(screen.getByLabelText('Middle Initial'), {
      target: { value: 'B' },
    })
    expect(screen.getByRole('link', { name: 'Address Logbook' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '0912abc3456789' },
    })
    expect(screen.getByLabelText('Phone')).toHaveValue('09123456789')
    expect(screen.queryByText(/Enter a valid PH mobile number/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: '   ' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('First name is required.')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    })

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '0912 345' },
    })
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Smith' },
    })

    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument()
    expect(screen.getByText(/0999 305 3242/)).toBeInTheDocument()
  })

  it('formats a phone number stored with the +63 country code', async () => {
    mocks.single.mockResolvedValue({
      data: { ...profile, phone: '+639993053242' },
      error: null,
    })

    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    expect(await screen.findByText('+63 999 305 3242')).toBeInTheDocument()
  })
})
