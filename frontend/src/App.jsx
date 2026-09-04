
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CalendarProvider } from './context/CalendarContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import CalendarView from './components/CalendarView/CalendarView'
import Settings from './components/Settings/Settings'
import Navbar from './components/Navigation/Navbar'
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CalendarProvider>
          <Router>
            <div className="app">
              <Navbar />
              <main style={{ flex: 1 }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <CalendarView />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          </Router>
        </CalendarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App