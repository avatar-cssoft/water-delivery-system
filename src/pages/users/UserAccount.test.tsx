import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserAccounts from './UserAccount'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('../../lib/supabase', () => {
  const query = {
    select: vi.fn(),
    eq: mocks.eq,
    update: mocks.update,
    single: mocks.single,
    maybeSingle: mocks.maybeSingle,
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.update.mockReturnValue(query)

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
    mocks.maybeSingle.mockResolvedValue({ data: { id: profile.id }, error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
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
    expect(screen.getByText(/\+63 999 305 3242/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Manage Addresses' })).toHaveAttribute(
      'href',
      '/account/address-logbook',
    )

    expect(screen.getByLabelText('First Name')).toHaveValue('Jane')
    expect(screen.getByLabelText('Middle Initial (optional)')).toHaveValue('B')
    expect(screen.getByLabelText('Middle Initial (optional)')).toHaveAttribute('maxLength', '2')
    expect(screen.getByLabelText('Last Name')).toHaveValue('Doe')
    expect(screen.getByText('+63')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveValue('9993053242')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('maxLength', '10')
    expect(screen.getByLabelText('Primary Address')).toHaveValue('1 Old Street')
    expect(screen.getByLabelText('Primary Address')).toHaveAttribute('readonly')
    expect(
      screen.getByRole('form', { name: 'Edit profile' }).compareDocumentPosition(
        screen.getByRole('button', { name: 'Cancel' }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    expect(screen.queryByRole('link', { name: 'Manage Addresses' })).not.toBeInTheDocument()
    expect(screen.getByText('Save changes to open Address Logbook')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Middle Initial (optional)'), {
      target: { value: 'AB.' },
    })
    expect(screen.getByLabelText('Middle Initial (optional)')).toHaveValue('AB')

    fireEvent.change(screen.getByLabelText('Middle Initial (optional)'), {
      target: { value: 'A1' },
    })
    expect(screen.getByLabelText('Middle Initial (optional)')).toHaveValue('A')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    })
    fireEvent.change(screen.getByLabelText('Middle Initial (optional)'), {
      target: { value: 'B' },
    })
    expect(screen.getByRole('link', { name: 'Manage Addresses' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '912abc3456789' },
    })
    expect(screen.getByLabelText('Phone')).toHaveValue('9123456789')
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
      target: { value: '912 345' },
    })
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Smith' },
    })

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument()
    expect(screen.getByText(/\+63 999 305 3242/)).toBeInTheDocument()
  })

  it('saves an empty middle initial as null', async () => {
    mocks.getUser
      .mockResolvedValueOnce({
        data: { user: { id: profile.id } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { id: 'account-id-at-save' } },
        error: null,
      })
    mocks.maybeSingle.mockResolvedValue({
      data: { id: 'account-id-at-save' },
      error: null,
    })

    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('Middle Initial (optional)'), {
      target: { value: '' },
    })

    expect(screen.getByLabelText('Middle Initial (optional)')).toHaveAttribute(
      'aria-invalid',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(mocks.getUser).toHaveBeenCalledTimes(2)
    expect(mocks.eq).toHaveBeenCalledWith('id', 'account-id-at-save')
    expect(mocks.update).toHaveBeenCalledWith({
      first_name: 'Jane',
      middle_initial: null,
      last_name: 'Doe',
      phone: '+639993053242',
    })
  })

  it('preserves the entered name casing when saving', async () => {
    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'MIKE' },
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'ARON' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(mocks.update).toHaveBeenCalledWith({
      first_name: 'MIKE',
      middle_initial: 'B',
      last_name: 'ARON',
      phone: '+639993053242',
    })
  })

  it('prevents editing or discarding while a save is in flight', async () => {
    let finishSave: (result: { data: { id: string }; error: null }) => void = () => {}
    mocks.maybeSingle.mockReturnValue(
      new Promise((resolve) => {
        finishSave = resolve
      }),
    )

    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalled())
    expect(screen.getByLabelText('First Name')).toBeDisabled()
    expect(screen.getByLabelText('Middle Initial (optional)')).toBeDisabled()
    expect(screen.getByLabelText('Last Name')).toBeDisabled()
    expect(screen.getByLabelText('Phone')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    await act(async () => {
      finishSave({ data: { id: profile.id }, error: null })
    })
    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
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

  it('explains a likely permission cause when the profile update fails', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    })

    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Probable cause: your account does not have permission to update this profile.',
    )
    expect(screen.getByLabelText('First Name')).toHaveValue('Janet')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
    expect(screen.queryByText(/You can save again in/)).not.toBeInTheDocument()
  })

  it('lets the user retry immediately after a failed save', async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: profile.id }, error: null })

    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not confirm your profile was saved.',
    )
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2)
  })

  it('rejects a successful-looking update response for a different profile ID', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { id: 'different-user-id' },
      error: null,
    })

    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'the server returned a different profile.',
    )
    expect(screen.getByLabelText('First Name')).toHaveValue('Janet')
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
  })

  it('uses the registration name validation rules while editing', async () => {
    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane1' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'First name can only contain letters, spaces, and . \' -',
    )
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: '  MIKE   ARON  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument()
    expect(mocks.update).toHaveBeenCalledWith({
      first_name: 'MIKE ARON',
      middle_initial: 'B',
      last_name: 'Doe',
      phone: '+639993053242',
    })
  })

  it('enforces the full 30-second cooldown after saving', async () => {
    render(
      <MemoryRouter>
        <UserAccounts />
      </MemoryRouter>,
    )

    await screen.findByText(/First Name:/)
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Janet' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    })
    expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument()
    expect(mocks.maybeSingle).toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith({
      first_name: 'Janet',
      middle_initial: 'B',
      last_name: 'Doe',
      phone: '+639993053242',
    })
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
    expect(screen.getByText('You can save again in 30 seconds.')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_999)
    })
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.queryByText(/You can save again in/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Jane' },
    })
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
  })
})
