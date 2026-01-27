import api, { PageData } from './api'

export interface ConfigItem {
  id: string
  key: string
  value: string
  value_type: string
  env_code: string
  app_code: string
  is_secret: boolean
  description: string
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface ConfigHistory {
  id: string
  config_id: string
  key: string
  old_value: string
  new_value: string
  env_code: string
  app_code: string
  version: number
  action: string
  created_by: string
  username: string
  created_at: string
}

export interface CreateConfigRequest {
  key: string
  value?: string
  value_type?: string
  env_code: string
  app_code?: string
  is_secret?: boolean
  description?: string
}

export const configService = {
  list: (params: { page?: number; page_size?: number; env_code?: string; app_code?: string; keyword?: string }) =>
    api.get<unknown, { data: PageData<ConfigItem> }>('/configs', { params }),

  create: (data: CreateConfigRequest) =>
    api.post<unknown, { data: ConfigItem }>('/configs', data),

  get: (id: string, decrypt?: boolean) =>
    api.get<unknown, { data: ConfigItem }>(`/configs/${id}`, { params: { decrypt } }),

  update: (id: string, data: { value?: string; description?: string }) =>
    api.put<unknown, { data: ConfigItem }>(`/configs/${id}`, data),

  delete: (id: string) =>
    api.delete(`/configs/${id}`),

  getHistory: (id: string, limit?: number) =>
    api.get<unknown, { data: ConfigHistory[] }>(`/configs/${id}/history`, { params: { limit } }),

  fetch: (envCode: string, appCode?: string) =>
    api.get<unknown, { data: Record<string, string> }>('/configs/fetch', { params: { env_code: envCode, app_code: appCode } }),
}
