import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/services/auth'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: User) => {
        localStorage.setItem('token', token)
        set({ token, user })
      },
      setUser: (user: User) => set({ user }),
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null })
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)
