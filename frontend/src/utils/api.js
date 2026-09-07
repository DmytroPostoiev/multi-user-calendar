import axios from 'axios'

// ============================================
// API-URL für Vercel (Produktion) vs. Lokal
// ============================================
const getApiUrl = () => {
  // In Produktion (Vercel) → volle URL
  if (import.meta.env.PROD) {
    return 'https://multi-user-calendar.vercel.app/api'
  }
  
  // In Entwicklung (lokal)
  if (import.meta.env.DEV) {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000/api`
    }
    return '/api'
  }
  
  // Fallback
  return '/api'
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' }
})

// ============================================
// Interceptor: Token automatisch anhängen
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ============================================
// Interceptor: Bei 401 → Logout
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api