import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'

type CurrentUser = {
  id: number
  username: string
  role: string
  permissions?: Record<string, any> | null
}

export default function RequireAdmin() {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchMe() {
      try {
        const { data } = await api.get<CurrentUser>('/users/me')
        if (!mounted) return
        setIsAdmin(data.role === 'propertyadmin')
      } catch {
        if (!mounted) return
        setIsAdmin(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchMe()
    return () => { mounted = false }
  }, [])

  if (loading) return null
  if (!isAdmin) {
    return <Navigate to="/" replace state={{ from: location }} />
  }
  return <Outlet />
}