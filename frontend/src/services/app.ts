import api, { PageData } from './api'

export interface Application {
  id: string
  name: string
  code: string
  type: string
  language: string
  repo_url: string
  branch: string
  deploy_path: string
  build_cmd: string
  start_cmd: string
  stop_cmd: string
  health_check: string
  env_id: string
  env?: Environment
  hosts?: { id: string; name: string; ip: string }[]
  status: number
  description: string
  created_by: string
  created_at: string
}

export interface Environment {
  id: string
  name: string
  code: string
  color: string
  description: string
}

export interface Deployment {
  id: string
  app_id: string
  app?: Application
  version: string
  commit_id: string
  commit_msg: string
  branch: string
  type: string
  status: number
  output: string
  start_time: string
  end_time: string
  created_by: string
  created_at: string
}

export interface CreateAppRequest {
  name: string
  code: string
  type: string
  language?: string
  repo_url?: string
  branch?: string
  deploy_path?: string
  build_cmd?: string
  start_cmd?: string
  stop_cmd?: string
  health_check?: string
  env_id?: string
  host_ids?: string[]
  description?: string
}

export const appService = {
  list: (params: { page?: number; page_size?: number; env_id?: string; keyword?: string }) =>
    api.get<unknown, { data: PageData<Application> }>('/apps', { params }),

  create: (data: CreateAppRequest) =>
    api.post<unknown, { data: Application }>('/apps', data),

  get: (id: string) =>
    api.get<unknown, { data: Application }>(`/apps/${id}`),

  update: (id: string, data: Partial<CreateAppRequest>) =>
    api.put<unknown, { data: Application }>(`/apps/${id}`, data),

  delete: (id: string) =>
    api.delete(`/apps/${id}`),

  // Environments
  listEnvironments: () =>
    api.get<unknown, { data: Environment[] }>('/environments'),

  // Deployments
  listDeployments: (appId: string, params: { page?: number; page_size?: number }) =>
    api.get<unknown, { data: PageData<Deployment> }>('/deployments', { params: { app_id: appId, ...params } }),

  createDeployment: (data: { app_id: string; version?: string; commit_id?: string; commit_msg?: string; branch?: string }) =>
    api.post<unknown, { data: Deployment }>('/deployments', data),

  getDeployment: (id: string) =>
    api.get<unknown, { data: Deployment }>(`/deployments/${id}`),

  startDeployment: (id: string) =>
    api.post(`/deployments/${id}/start`),

  rollback: (data: { app_id: string; target_deploy_id: string }) =>
    api.post<unknown, { data: Deployment }>('/deployments/rollback', data),
}
