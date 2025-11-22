import axios from 'axios'
import { API_URL, SUBDOMAIN } from '../config'
import { notifications } from '@mantine/notifications'

console.log('[API Client] Creating axios instance with API_URL:', API_URL);

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
})

// Create a separate API client for authentication (parent backend)
export const authApi = axios.create({
  baseURL: 'http://localhost:8001', // Parent backend for authentication (actual running port)
  withCredentials: false,
})

// Add authentication interceptor to authApi
authApi.interceptors.request.use((config) => {
  console.log('[Auth API Client] Making request to:', config.url);
  console.log('[Auth API Client] Base URL:', config.baseURL);
  console.log('[Auth API Client] Full URL:', config.baseURL ? config.baseURL + (config.url || '') : config.url);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  
  return config
})

api.interceptors.request.use((config) => {
  console.log('[API Client] Making request to:', config.url);
  console.log('[API Client] Base URL:', config.baseURL);
  console.log('[API Client] Full URL:', config.baseURL ? config.baseURL + (config.url || '') : config.url);
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  
  // Add subdomain as query parameter for tenant context
  // Check query parameter at runtime to handle dynamic subdomain changes
  let effectiveSubdomain = SUBDOMAIN;
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const querySubdomain = urlParams.get('subdomain');
    effectiveSubdomain = querySubdomain || SUBDOMAIN;
  }
  
  if (effectiveSubdomain) {
    config.params = config.params || {}
    config.params['subdomain'] = effectiveSubdomain
    config.headers = config.headers || {}
    config.headers['X-Client-Site-ID'] = effectiveSubdomain
  }
  
  return config
})

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    // Surface 401s gracefully; caller can handle
    const status = error?.response?.status
    const detail = error?.response?.data?.detail
    if (typeof window !== 'undefined' && status === 403 && String(detail).toLowerCase().includes('inactive')) {
      try {
        notifications.show({ title: 'Access blocked', message: 'Your account is inactive. Please contact your administrator.', color: 'red' })
      } catch {}
      try {
        localStorage.removeItem('token')
      } catch {}
      // Redirect to login to make it explicit
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)