import { Link } from 'react-router-dom'
import { useNavRole } from '../components/useNavRole'

export default function Settings() {
  const { role } = useNavRole()
  const signedIn = role !== 'guest' && role !== 'checking'

  return (
    <section>
      <h1>Settings</h1>
      <p>Adjust your preferences for a more comfortable experience.</p>
      <nav className="settings-actions" aria-label="Settings">
        {signedIn && (
          <Link className="settings-action" to="/account/change-password">
            Change Password
          </Link>
        )}
        {signedIn && (
          <Link className="settings-action" to="/account/address-logbook">
            Address Logbook
          </Link>
        )}
        <Link className="settings-action" to="/accessibility">
          Accessibility
        </Link>
      </nav>
    </section>
  )
}
