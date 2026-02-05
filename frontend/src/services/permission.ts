import api from './api'

export interface Permission {
  id: string
  name: string
  code: string
  type: string  // menu, button, api
  resource: string
  action: string
  parent_id: string | null
  path: string
  method: string
  icon: string
  sort: number
  status: number
  children?: Permission[]
}

export interface Role {
  id: string
  name: string
  code: string
  description: string
  permissions?: Permission[]
}

// 获取权限树
export async function getPermissionTree() {
  const res = await api.get('/permissions/tree')
  return res.data
}

// 获取所有权限
export async function getPermissions() {
  const res = await api.get('/permissions')
  return res.data
}

// 获取角色列表（包含权限）
export async function getRolesWithPermissions() {
  const res = await api.get('/roles', { params: { with_permissions: true } })
  return res.data
}

// 获取角色详情
export async function getRole(id: string) {
  const res = await api.get(`/roles/${id}`)
  return res.data
}

// 创建角色
export async function createRole(data: {
  name: string
  description?: string
}) {
  const res = await api.post('/roles', data)
  return res.data
}

// 更新角色
export async function updateRole(id: string, data: {
  name?: string
  description?: string
}) {
  const res = await api.put(`/roles/${id}`, data)
  return res.data
}

// 删除角色
export async function deleteRole(id: string) {
  const res = await api.delete(`/roles/${id}`)
  return res.data
}

// 设置角色权限
export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const res = await api.put(`/roles/${roleId}/permissions`, { permission_ids: permissionIds })
  return res.data
}

// 获取角色权限
export async function getRolePermissions(roleId: string) {
  const res = await api.get(`/roles/${roleId}/permissions`)
  return res.data
}

// 权限类型标签
export const PermissionTypeLabels: Record<string, string> = {
  menu: '菜单',
  button: '按钮',
  api: 'API',
}

// 资源类型标签
export const ResourceLabels: Record<string, string> = {
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

// 操作类型标签
export const ActionLabels: Record<string, string> = {
  view: '查看',
  create: '创建',
  update: '更新',
  delete: '删除',
  execute: '执行',
}
