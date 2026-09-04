import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Button from '../common/Button'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <span className="brand-icon">📅</span>
          <span className="brand-text">Calendar</span>
        </Link>
      </div>
      
      <div className="navbar-menu">
        <span className="navbar-user">
          👤 {user.name || user.email}
        </span>
        <Link to="/settings" className="navbar-link">
          ⚙️ Settings
        </Link>
        <button 
          className="navbar-theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <Button variant="secondary" size="small" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </nav>
  )
}

export default Navbar