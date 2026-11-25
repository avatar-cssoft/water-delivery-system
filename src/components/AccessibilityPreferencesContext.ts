import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'
export type TextSize = 'standard' | 'large' | 'extra-large'

export type AccessibilityPreferencesValue = {
  theme: Theme
  textSize: TextSize
  setTheme: (theme: Theme) => void
  setTextSize: (textSize: TextSize) => void
  resetPreferences: () => void
}

export const AccessibilityPreferencesContext =
  createContext<AccessibilityPreferencesValue | null>(null)

export function useAccessibilityPreferences() {
  const preferences = useContext(AccessibilityPreferencesContext)

  if (!preferences) {
    throw new Error(
      'useAccessibilityPreferences must be used within AccessibilityPreferencesProvider',
    )
  }

  return preferences
}
