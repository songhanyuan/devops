import api, { PageData } from './api'

export interface Host {
  id: string
  name: string
  hostname: string
  ip: string
  port: number
  username: string
  auth_type: string
  os: string
  arch: string
  status: number
  group_id: string
  group?: HostGroup
  tags?: HostTag[]
  description: string
  created_at: string
}

export interface HostGroup {
  id: string
  name: string
  parent_id: string
  description: string
}

export interface HostTag {
  id: string
  name: string
  color: string
}

export interface CreateHostRequest {
  name: string
  hostname?: string
  ip: string
  port?: number
  username?: string
  auth_type?: string
  password?: string
  private_key?: string
  os?: string
  arch?: string
  group_id?: string
  description?: string
}

export const hostService = {
  list: (params: { page?: number; page_size?: number; group_id?: string; keyword?: string; status?: number }) =>
    api.get<unknown, { data: PageData<Host> }>('/hosts', { params }),

  create: (data: CreateHostRequest) =>
    api.post<unknown, { data: Host }>('/hosts', data),

  get: (id: string) =>
    api.get<unknown, { data: Host }>(`/hosts/${id}`),

  update: (id: string, data: Partial<CreateHostRequest>) =>
    api.put<unknown, { data: Host }>(`/hosts/${id}`, data),

  delete: (id: string) =>
    api.delete(`/hosts/${id}`),

  testConnection: (id: string) =>
    api.post(`/hosts/${id}/test`),

  // Groups
  listGroups: () =>
    api.get<unknown, { data: HostGroup[] }>('/host-groups'),

  createGroup: (data: { name: string; description?: string; parent_id?: string }) =>
    api.post<unknown, { data: HostGroup }>('/host-groups', data),

  deleteGroup: (id: string) =>
    api.delete(`/host-groups/${id}`),

  // Tags
  listTags: () =>
    api.get<unknown, { data: HostTag[] }>('/host-tags'),

  createTag: (data: { name: string; color?: string }) =>
    api.post<unknown, { data: HostTag }>('/host-tags', data),

  deleteTag: (id: string) =>
    api.delete(`/host-tags/${id}`),
}
