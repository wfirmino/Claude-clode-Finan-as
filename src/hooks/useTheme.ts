import { useState } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app-theme') as Theme) ?? 'dark'
  })

  const isDark = theme === 'dark' ||
    (theme === 'auto' && typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  function changeTheme(t: Theme) {
    setTheme(t)
    localStorage.setItem('app-theme', t)
  }

  return { theme, isDark, changeTheme }
}
