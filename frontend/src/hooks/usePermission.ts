import { useAuthStore } from '@/stores/auth'

/**
 * 权限检查 Hook
 * @param code 权限码
 * @returns 是否有权限
 */
export function usePermission(code: string): boolean {
  return useAuthStore(state => state.hasPermission(code))
}

/**
 * 检查是否有任一权限
 * @param codes 权限码数组
 * @returns 是否有任一权限
 */
export function useAnyPermission(...codes: string[]): boolean {
  return useAuthStore(state => state.hasAnyPermission(...codes))
}

/**
 * 检查是否是管理员
 */
export function useIsAdmin(): boolean {
  return useAuthStore(state => state.isAdmin())
}

/**
 * 获取所有权限码
 */
export function usePermissions(): string[] {
  return useAuthStore(state => state.permissions)
}

// 权限码常量
export const PermissionCodes = {
  // 用户管理
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  // 角色管理
  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  // 分组管理
  GROUP_VIEW: 'group:view',
  GROUP_CREATE: 'group:create',
  GROUP_UPDATE: 'group:update',
  GROUP_DELETE: 'group:delete',
  // 主机管理
  HOST_VIEW: 'host:view',
  HOST_CREATE: 'host:create',
  HOST_UPDATE: 'host:update',
  HOST_DELETE: 'host:delete',
  HOST_CONNECT: 'host:connect',
  // 应用管理
  APP_VIEW: 'app:view',
  APP_CREATE: 'app:create',
  APP_UPDATE: 'app:update',
  APP_DELETE: 'app:delete',
  // 部署管理
  DEPLOY_VIEW: 'deploy:view',
  DEPLOY_CREATE: 'deploy:create',
  DEPLOY_EXECUTE: 'deploy:execute',
  DEPLOY_ROLLBACK: 'deploy:rollback',
  // 配置管理
  CONFIG_VIEW: 'config:view',
  CONFIG_CREATE: 'config:create',
  CONFIG_UPDATE: 'config:update',
  CONFIG_DELETE: 'config:delete',
  // K8s管理
  CLUSTER_VIEW: 'cluster:view',
  CLUSTER_CREATE: 'cluster:create',
  CLUSTER_UPDATE: 'cluster:update',
  CLUSTER_DELETE: 'cluster:delete',
  K8S_APPLY_YAML: 'k8s:apply-yaml',
  // 审计日志
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
} as const
