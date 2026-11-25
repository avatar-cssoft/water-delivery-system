import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AccessibilityPreferencesContext,
  type TextSize,
  type Theme,
} from './AccessibilityPreferencesContext'

const THEME_KEY = 'accessibility-theme'
const TEXT_SIZE_KEY = 'accessibility-text-size'

function readPreference<T extends string>(
  key: string,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  try {
    const storedValue = localStorage.getItem(key)
    return allowedValues.find((value) => value === storedValue) ?? defaultValue
  } catch (error) {
    console.error(`Unable to read accessibility preference "${key}":`, error)
    return defaultValue
  }
}

export function AccessibilityPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [theme, setTheme] = useState<Theme>(() =>
    readPreference(THEME_KEY, ['dark', 'light'], 'dark'),
  )
  const [textSize, setTextSize] = useState<TextSize>(() =>
    readPreference(
      TEXT_SIZE_KEY,
      ['standard', 'large', 'extra-large'],
      'standard',
    ),
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.textSize = textSize

    try {
      localStorage.setItem(THEME_KEY, theme)
      localStorage.setItem(TEXT_SIZE_KEY, textSize)
    } catch (error) {
      console.error('Unable to save accessibility preferences:', error)
    }
  }, [theme, textSize])

  const value = {
    theme,
    textSize,
    setTheme,
    setTextSize,
    resetPreferences: () => {
      setTheme('dark')
      setTextSize('standard')
    },
  }

  return (
    <AccessibilityPreferencesContext.Provider value={value}>
      {children}
    </AccessibilityPreferencesContext.Provider>
  )
}
