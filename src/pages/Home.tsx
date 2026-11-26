import { NavLink } from 'react-router-dom'

export default function Home() {
  return (
    <main className="public-home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow">
            <span aria-hidden="true" /> Water delivery, made simple
          </p>
          <h1 id="home-title">Water Delivery System</h1>
          <p className="home-intro">
            Get the water you need, delivered to your door. Browse refills,
            save your address, and follow your order from one place.
          </p>
          <div className="home-actions">
            <NavLink className="home-action-primary" to="/register">
              Create an account
            </NavLink>
            <NavLink className="home-action-secondary" to="/login">
              Sign in
            </NavLink>
          </div>
          <p className="home-hint">New here? Create an account to get started.</p>
        </div>

        <div className="home-delivery-card">
          <div className="home-delivery-card-heading">
            <span className="home-water-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32">
                <path d="M16 3.5C12.4 9 7.5 14.2 7.5 20a8.5 8.5 0 0 0 17 0c0-5.8-4.9-11-8.5-16.5Z" />
                <path d="M12 21a4 4 0 0 0 4 4" />
              </svg>
            </span>
            <span>Order with confidence</span>
          </div>
          <h2>From refill to doorstep</h2>
          <ol className="home-steps">
            <li>
              <span className="home-step-number">1</span>
              <span>
                <strong>Choose your water</strong>
                <small>Find the refill that fits your needs.</small>
              </span>
            </li>
            <li>
              <span className="home-step-number">2</span>
              <span>
                <strong>Set your address</strong>
                <small>Keep your delivery details in one place.</small>
              </span>
            </li>
            <li>
              <span className="home-step-number">3</span>
              <span>
                <strong>Follow your order</strong>
                <small>Check its progress as it makes its way to you.</small>
              </span>
            </li>
          </ol>
          <div className="home-card-footer">
            <span className="home-status-dot" aria-hidden="true" />
            Simple ordering, useful updates
          </div>
        </div>
      </section>

      <section className="home-benefits" aria-label="What you can do">
        <article>
          <span className="home-benefit-index">01</span>
          <h2>Browse refills</h2>
          <p>See available water products and their sizes before you order.</p>
        </article>
        <article>
          <span className="home-benefit-index">02</span>
          <h2>Save your address</h2>
          <p>Keep your delivery information ready for the next order.</p>
        </article>
        <article>
          <span className="home-benefit-index">03</span>
          <h2>Track deliveries</h2>
          <p>Follow order progress from your customer account.</p>
        </article>
      </section>
    </main>
  )
}
