import React, { createContext, useState, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const themes = {
  light: {
    background: '#f8f9fa',
    surface: '#ffffff',
    primary: '#4a90e2',
    secondary: '#6c757d',
    text: '#333333',
    border: '#ddd',
    shadow: '0 2px 10px rgba(0,0,0,0.1)',
    eventColors: ['#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']
  },
  dark: {
    background: '#1a1a2e',
    surface: '#2d2d44',
    primary: '#6c5ce7',
    secondary: '#a8a8b8',
    text: '#e0e0e0',
    border: '#444',
    shadow: '0 2px 10px rgba(0,0,0,0.3)',
    eventColors: ['#6c5ce7', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']
  }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved || 'light'
  })
  const [accentColor, setAccentColor] = useState(() => {
    const saved = localStorage.getItem('accentColor')
    return saved || '#4a90e2'
  })

  useEffect(() => {
    localStorage.setItem('theme', theme)
    localStorage.setItem('accentColor', accentColor)
    
    // Apply theme to document
    const themeObj = themes[theme]
    document.documentElement.style.setProperty('--background-color', themeObj.background)
    document.documentElement.style.setProperty('--surface-color', themeObj.surface)
    document.documentElement.style.setProperty('--text-color', themeObj.text)
    document.documentElement.style.setProperty('--border-color', themeObj.border)
    document.documentElement.style.setProperty('--shadow', themeObj.shadow)
    document.documentElement.style.setProperty('--primary-color', accentColor)
  }, [theme, accentColor])

  const value = {
    theme,
    accentColor,
    themes,
    setTheme,
    setAccentColor
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}