import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/services/auth'

interface AuthState {
  token: string | null
  user: User | null
  permissions: string[]
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  setPermissions: (permissions: string[]) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasPermission: (code: string) => boolean
  hasAnyPermission: (...codes: string[]) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissions: [],
      setAuth: (token: string, user: User) => {
        localStorage.setItem('token', token)
        set({ token, user })
      },
      setUser: (user: User) => set({ user }),
      setPermissions: (permissions: string[]) => set({ permissions }),
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null, permissions: [] })
      },
      isAuthenticated: () => !!get().token,
      hasPermission: (code: string) => {
        const { user, permissions } = get()
        // admin 拥有所有权限
        if (user?.role?.code === 'admin') return true
        return permissions.includes(code)
      },
      hasAnyPermission: (...codes: string[]) => {
        const { user, permissions } = get()
        if (user?.role?.code === 'admin') return true
        return codes.some(code => permissions.includes(code))
      },
      isAdmin: () => get().user?.role?.code === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        permissions: state.permissions
      }),
    }
  )
)
