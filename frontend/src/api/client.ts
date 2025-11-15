import axios from 'axios'
import { API_URL } from '../config'
import { notifications } from '@mantine/notifications'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
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