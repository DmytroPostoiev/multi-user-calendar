import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useCalendar } from '../../context/CalendarContext'
import Button from '../common/Button'
import './Settings.css'

const Settings = () => {
  const { user } = useAuth()
  const { theme, setTheme, accentColor, setAccentColor } = useTheme()
  const { view, setView } = useCalendar()
  
  const [settings, setSettings] = useState({
    defaultView: view,
    theme: theme,
    accentColor: accentColor
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Load user settings from API
    const loadSettings = async () => {
      try {
        // In a real app, fetch from API
        // const response = await api.get('/settings')
        // setSettings(response.data)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    loadSettings()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Apply settings
      setTheme(settings.theme)
      setAccentColor(settings.accentColor)
      setView(settings.defaultView)
      
      // In a real app, save to API
      // await api.put('/settings', settings)
      
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const accentColors = [
    '#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#3498db',
    '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'
  ]

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h2>Settings</h2>
        <p className="settings-subtitle">Customize your calendar experience</p>
        
        {message && (
          <div className={`settings-message ${message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSave} className="settings-form">
          <div className="settings-section">
            <h3>General Settings</h3>
            
            <div className="form-group">
              <label htmlFor="defaultView">Default View</label>
              <select
                id="defaultView"
                name="defaultView"
                value={settings.defaultView}
                onChange={handleChange}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Theme Settings</h3>
            
            <div className="form-group">
              <label>Theme Mode</label>
              <div className="theme-selector">
                <button
                  type="button"
                  className={`theme-option ${settings.theme === 'light' ? 'selected' : ''}`}
                  onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                >
                  ☀️ Light
                </button>
                <button
                  type="button"
                  className={`theme-option ${settings.theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Accent Color</label>
              <div className="accent-color-grid">
                {accentColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`accent-option ${settings.accentColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSettings(prev => ({ ...prev, accentColor: color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Account</h3>
            <div className="account-info">
              <p><strong>Name:</strong> {user?.name}</p>
              <p><strong>Email:</strong> {user?.email}</p>
            </div>
          </div>
          
          <Button type="submit" variant="primary" loading={loading}>
            Save Settings
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Settings