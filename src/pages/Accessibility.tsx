import { Link } from 'react-router-dom'
import { useAccessibilityPreferences } from '../components/AccessibilityPreferencesContext'

export default function Accessibility() {
  const {
    theme,
    textSize,
    setTheme,
    setTextSize,
    resetPreferences,
  } = useAccessibilityPreferences()

  return (
    <section className="accessibility-page">
      <h1>Accessibility</h1>
      <p className="accessibility-intro">
        Make the pages easier to read. Your choices are saved on this device
        and apply throughout the app.
      </p>

      <fieldset className="accessibility-options">
        <legend>Choose a color theme</legend>
        <p>Pick the look that feels most comfortable to you.</p>
        <div className="accessibility-choice-list">
          <label className="accessibility-choice">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={() => setTheme('light')}
            />
            <span>
              <strong>Light</strong>
              <small>Bright background with dark text</small>
            </span>
          </label>
          <label className="accessibility-choice">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={() => setTheme('dark')}
            />
            <span>
              <strong>Dark</strong>
              <small>Dark background with light text</small>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset className="accessibility-options">
        <legend>Choose text size</legend>
        <p>Larger text can be easier to read on any screen.</p>
        <div className="accessibility-choice-list">
          <label className="accessibility-choice">
            <input
              type="radio"
              name="text-size"
              value="standard"
              checked={textSize === 'standard'}
              onChange={() => setTextSize('standard')}
            />
            <span>
              <strong>Standard</strong>
              <small>Regular text size</small>
            </span>
          </label>
          <label className="accessibility-choice">
            <input
              type="radio"
              name="text-size"
              value="large"
              checked={textSize === 'large'}
              onChange={() => setTextSize('large')}
            />
            <span>
              <strong>Large</strong>
              <small>About 12% larger</small>
            </span>
          </label>
          <label className="accessibility-choice">
            <input
              type="radio"
              name="text-size"
              value="extra-large"
              checked={textSize === 'extra-large'}
              onChange={() => setTextSize('extra-large')}
            />
            <span>
              <strong>Extra large</strong>
              <small>About 25% larger</small>
            </span>
          </label>
        </div>
      </fieldset>

      <aside className="accessibility-limitations">
        <h2>What to expect</h2>
        <p>
          These settings change the app’s colors and text. Some images, maps,
          embedded content, or elements with fixed-size designs may not change
          in the same way. New pages using custom colors or fixed pixel text may
          also need extra styling to follow these preferences. You can use your
          browser’s zoom to enlarge the whole page.
        </p>
      </aside>

      <div className="accessibility-actions">
        <button
          type="button"
          className="accessibility-reset"
          onClick={resetPreferences}
        >
          Reset to defaults
        </button>
        <Link to="/settings">Back to Settings</Link>
      </div>
    </section>
  )
}
