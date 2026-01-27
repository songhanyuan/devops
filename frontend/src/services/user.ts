import api, { PageData } from './api'

export interface User {
  id: string
  username: string
  email: string
  phone: string
  real_name: string
  avatar: string
  status: number
  role_id: string
  role?: Role
  last_login: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  code: string
  description: string
}

export interface CreateUserRequest {
  username: string
  password: string
  email: string
  real_name?: string
  phone?: string
  role_id: string
}

export interface UpdateUserRequest {
  email?: string
  real_name?: string
  phone?: string
  role_id?: string
  status?: number
}

export const userService = {
  list: (params: { page?: number; page_size?: number; keyword?: string }) =>
    api.get<unknown, { data: PageData<User> }>('/users', { params }),

  create: (data: CreateUserRequest) =>
    api.post<unknown, { data: User }>('/users', data),

  get: (id: string) =>
    api.get<unknown, { data: User }>(`/users/${id}`),

  update: (id: string, data: UpdateUserRequest) =>
    api.put<unknown, { data: User }>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),

  resetPassword: (id: string, password: string) =>
    api.post(`/users/${id}/reset-password`, { password }),

  // Roles
  listRoles: () =>
    api.get<unknown, { data: Role[] }>('/roles'),
}
