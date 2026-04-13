import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  const isAuthRoute = config.url?.includes('/auth/login') || config.url?.includes('/auth/register') || config.url?.includes('/auth/refresh')
  if (token && !isAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh token on 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem('refresh_token')
    ) {
      originalRequest._retry = true
      try {
        const { data } = await axios.post('/api/auth/refresh/', {
          refresh: localStorage.getItem('refresh_token'),
        })
        localStorage.setItem('access_token', data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch {
        // Refresh failed → clear tokens
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
