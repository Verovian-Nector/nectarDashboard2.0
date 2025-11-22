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
        // Check for admin roles - 'propertyadmin' is the primary role expected by child frontend
        const adminRoles = ['propertyadmin', 'admin', 'super_admin']
        setIsAdmin(adminRoles.includes(data.role))
        console.log('[RequireAdmin] User role:', data.role, 'Is admin:', adminRoles.includes(data.role))
      } catch (error) {
        console.error('[RequireAdmin] Failed to fetch user role:', error)
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
    console.log('[RequireAdmin] Access denied - user is not an admin')
    return <Navigate to="/" replace state={{ from: location }} />
  }
  return <Outlet />
}