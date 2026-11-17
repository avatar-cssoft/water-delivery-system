import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChangePassword from './ChangePassword'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      updateUser: mocks.updateUser,
    },
  },
}))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/account/change-password']}>
      <Routes>
        <Route path="/account/change-password" element={<ChangePassword />} />
        <Route path="/login" element={<p>Sign-in page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'registered-user', email: 'user@example.com' } },
      error: null,
    })
    mocks.updateUser.mockResolvedValue({
      data: { user: { id: 'registered-user' } },
      error: null,
    })
  })

  it('redirects signed-out visitors to sign in without rendering the form', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    renderPage()

    expect(await screen.findByText('Sign-in page')).toBeInTheDocument()
    expect(
      screen.queryByRole('form', { name: 'Change password' }),
    ).not.toBeInTheDocument()
  })

  it('validates password length and matching confirmation before calling Supabase', async () => {
    renderPage()

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'current-password' },
    })
    const newPassword = await screen.findByLabelText('New password')
    const confirmation = screen.getByLabelText('Confirm new password')

    fireEvent.change(newPassword, { target: { value: 'short' } })
    fireEvent.change(confirmation, { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()

    fireEvent.change(newPassword, { target: { value: 'long-enough-password' } })
    fireEvent.change(confirmation, { target: { value: 'different-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()

    fireEvent.change(newPassword, { target: { value: 'a'.repeat(73) } })
    fireEvent.change(confirmation, { target: { value: 'a'.repeat(73) } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(
      screen.getByText('Password must be no more than 72 bytes.'),
    ).toBeInTheDocument()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('updates the password through Supabase Auth and confirms success', async () => {
    renderPage()

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'current-password' },
    })
    fireEvent.change(await screen.findByLabelText('New password'), {
      target: { value: 'new-secure-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your password has been changed.',
    )
    expect(mocks.updateUser).toHaveBeenCalledWith({
      current_password: 'current-password',
      password: 'new-secure-password',
    })
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
  })

  it('shows Supabase errors without reporting a successful update', async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password update rejected.' },
    })

    renderPage()

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'current-password' },
    })
    fireEvent.change(await screen.findByLabelText('New password'), {
      target: { value: 'new-secure-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not update your password. Password update rejected.',
    )
    expect(
      screen.queryByText('Your password has been changed.'),
    ).not.toBeInTheDocument()
  })

  it('does not update the password when the current password is incorrect', async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Current password is incorrect' },
    })

    renderPage()

    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'wrong-current-password' },
    })
    fireEvent.change(await screen.findByLabelText('New password'), {
      target: { value: 'new-secure-password' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your current password is incorrect.',
    )
    expect(mocks.updateUser).toHaveBeenCalledWith({
      current_password: 'wrong-current-password',
      password: 'new-secure-password',
    })
  })
})
