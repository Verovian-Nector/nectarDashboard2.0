import { create } from 'zustand'

type SessionState = {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
}

export const useSession = create<SessionState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  setToken: (token) => {
    try { localStorage.setItem('token', token) } catch {}
    set({ token })
  },
  clearToken: () => {
    try { localStorage.removeItem('token') } catch {}
    set({ token: null })
  },
}))