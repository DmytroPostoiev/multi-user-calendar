import axios from 'axios'

// ============================================
// API-URL – NUR für Vercel (HTTPS)
// ============================================
const API_URL = 'https://multi-user-calendar1-six.vercel.app/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// ============================================
// Interceptor: Token anhängen
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