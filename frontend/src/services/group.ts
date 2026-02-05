import api from './api'

export interface UserGroup {
  id: string
  name: string
  description: string
  parent_id: string | null
  users?: User[]
  roles?: Role[]
  created_by: string
  created_at: string
}

export interface User {
  id: string
  username: string
  email: string
  real_name: string
  status: number
}

export interface Role {
  id: string
  name: string
  code: string
}

export interface GroupNode extends UserGroup {
  children?: GroupNode[]
}

// 获取分组列表
export async function getGroups(params?: {
  page?: number
  page_size?: number
  keyword?: string
}) {
  const res = await api.get('/user-groups', { params })
  return res.data
}

// 获取分组树
export async function getGroupTree() {
  const res = await api.get('/user-groups/tree')
  return res.data
}

// 获取分组详情
export async function getGroup(id: string) {
  const res = await api.get(`/user-groups/${id}`)
  return res.data
}

// 创建分组
export async function createGroup(data: {
  name: string
  description?: string
  parent_id?: string
}) {
  const res = await api.post('/user-groups', data)
  return res.data
}

// 更新分组
export async function updateGroup(id: string, data: {
  name?: string
  description?: string
  parent_id?: string | null
}) {
  const res = await api.put(`/user-groups/${id}`, data)
  return res.data
}

// 删除分组
export async function deleteGroup(id: string) {
  const res = await api.delete(`/user-groups/${id}`)
  return res.data
}

// 获取分组成员
export async function getGroupMembers(id: string) {
  const res = await api.get(`/user-groups/${id}/members`)
  return res.data
}

// 添加分组成员
export async function addGroupMembers(id: string, userIds: string[]) {
  const res = await api.post(`/user-groups/${id}/members`, { user_ids: userIds })
  return res.data
}

// 移除分组成员
export async function removeGroupMember(groupId: string, userId: string) {
  const res = await api.delete(`/user-groups/${groupId}/members/${userId}`)
  return res.data
}

// 设置分组角色
export async function setGroupRoles(id: string, roleIds: string[]) {
  const res = await api.put(`/user-groups/${id}/roles`, { role_ids: roleIds })
  return res.data
}
