import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  role: localStorage.getItem('role') || null,
  permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
  
  login: (user, token, role, permissions) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('permissions', JSON.stringify(permissions))
    set({ user, token, role, permissions })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('permissions')
    set({ user: null, token: null, role: null, permissions: [] })
  },
  
  hasPermission: (permission) => {
    const state = useAuthStore.getState()
    return state.permissions.includes(permission) || state.role === 'super_admin'
  },
  
  isSuperAdmin: () => {
    const state = useAuthStore.getState()
    return state.role === 'super_admin'
  },
}))
