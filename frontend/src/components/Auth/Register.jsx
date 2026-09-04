
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../common/Button'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const result = await register(email, password, name)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface-color)',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: 'var(--shadow)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Create Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--secondary-color)', marginBottom: '30px' }}>
          Start managing your calendar
        </p>
        
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--background-color)',
                color: 'var(--text-color)',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--background-color)',
                color: 'var(--text-color)',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min 6 characters"
              minLength="6"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--background-color)',
                color: 'var(--text-color)',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--background-color)',
                color: 'var(--text-color)',
                fontSize: '16px'
              }}
            />
          </div>
          
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--secondary-color)' }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}

export default Register