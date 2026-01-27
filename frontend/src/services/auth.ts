import api from './api'

export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
  email: string
  real_name: string
  phone: string
  avatar: string
  status: number
  role_id: string
  role?: Role
  last_login: string
  created_at: string
}

export interface Role {
  id: string
  name: string
  code: string
  description: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const authService = {
  login: (data: LoginRequest) =>
    api.post<unknown, { data: LoginResponse }>('/auth/login', data),

  register: (data: { username: string; password: string; email: string }) =>
    api.post<unknown, { data: User }>('/auth/register', data),

  getCurrentUser: () =>
    api.get<unknown, { data: User }>('/auth/me'),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),

  getRoles: () =>
    api.get<unknown, { data: Role[] }>('/roles'),
}
