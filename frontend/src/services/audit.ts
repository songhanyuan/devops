import api from './api'

export interface AuditLog {
  id: string
  user_id: string
  username: string
  action: string
  module: string
  resource: string
  resource_id: string
  resource_name: string
  old_value: string
  new_value: string
  detail: string
  ip: string
  user_agent: string
  status: number
  error_message: string
  duration: number
  trace_id: string
  created_at: string
}

export interface AuditStats {
  total_count: number
  success_count: number
  failed_count: number
  action_counts: Record<string, number>
  module_counts: Record<string, number>
  top_users: {
    user_id: string
    username: string
    count: number
  }[]
  hourly_trend: {
    hour: string
    count: number
  }[]
}

export interface AuditQueryParams {
  page?: number
  page_size?: number
  user_id?: string
  username?: string
  module?: string
  action?: string
  resource_id?: string
  status?: number
  start_time?: string
  end_time?: string
  keyword?: string
  trace_id?: string
  ip?: string
}

// 查询审计日志
export async function getAuditLogs(params?: AuditQueryParams) {
  const res = await api.get('/audit-logs', { params })
  return res.data
}

// 获取日志详情
export async function getAuditLog(id: string) {
  const res = await api.get(`/audit-logs/${id}`)
  return res.data
}

// 获取统计数据
export async function getAuditStats(params?: {
  start_time?: string
  end_time?: string
}) {
  const res = await api.get('/audit-logs/stats', { params })
  return res.data
}

// 导出日志
export async function exportAuditLogs(params?: AuditQueryParams) {
  const res = await api.get('/audit-logs/export', {
    params,
    responseType: 'blob'
  })
  return res.data
}

// 获取用户操作历史
export async function getUserAuditHistory(userId: string, limit?: number) {
  const res = await api.get(`/audit-logs/user/${userId}`, {
    params: { limit }
  })
  return res.data
}

// 获取资源变更历史
export async function getResourceAuditHistory(
  module: string,
  resourceId: string,
  limit?: number
) {
  const res = await api.get(`/audit-logs/resource/${module}/${resourceId}`, {
    params: { limit }
  })
  return res.data
}

// 获取追踪链路
export async function getTraceHistory(traceId: string) {
  const res = await api.get(`/audit-logs/trace/${traceId}`)
  return res.data
}

// 操作类型映射
export const ActionLabels: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  view: '查看',
  login: '登录',
  logout: '登出',
  execute: '执行',
}

// 模块类型映射
export const ModuleLabels: Record<string, string> = {
  user: '用户管理',
  role: '角色管理',
  group: '分组管理',
  host: '主机管理',
  app: '应用管理',
  deploy: '部署管理',
  config: '配置管理',
  cluster: 'K8s集群',
  audit: '审计日志',
}
