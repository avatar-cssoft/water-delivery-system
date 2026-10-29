import { Link } from 'react-router-dom'

function AddressLogbook() {
  return (
    <div>
      <h1>Address Logbook</h1>
      <p>Saved addresses will be available here in a future update.</p>
      <Link to="/account">Back to My Account</Link>
    </div>
  )
}

export default AddressLogbook
