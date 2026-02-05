package service

import (
	"encoding/json"
	"strings"
	"sync"
	"time"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
)

type PermissionService struct {
	permRepo     *repository.PermissionRepository
	resourceRepo *repository.ResourcePermissionRepository
	roleRepo     *repository.RoleRepository
	groupRepo    *repository.UserGroupRepository
	cache        *permissionCache
}

// permissionCache 简单的权限缓存
type permissionCache struct {
	mu       sync.RWMutex
	userPerm map[uuid.UUID]cachedPermissions
	ttl      time.Duration
}

type cachedPermissions struct {
	codes     map[string]bool
	expiredAt time.Time
}

func newPermissionCache(ttl time.Duration) *permissionCache {
	return &permissionCache{
		userPerm: make(map[uuid.UUID]cachedPermissions),
		ttl:      ttl,
	}
}

func (c *permissionCache) Get(userID uuid.UUID, code string) (bool, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	cached, ok := c.userPerm[userID]
	if !ok || time.Now().After(cached.expiredAt) {
		return false, false
	}
	hasPerm, ok := cached.codes[code]
	return hasPerm, ok
}

func (c *permissionCache) Set(userID uuid.UUID, codes map[string]bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.userPerm[userID] = cachedPermissions{
		codes:     codes,
		expiredAt: time.Now().Add(c.ttl),
	}
}

func (c *permissionCache) Invalidate(userID uuid.UUID) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.userPerm, userID)
}

func (c *permissionCache) InvalidateAll() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.userPerm = make(map[uuid.UUID]cachedPermissions)
}

func NewPermissionService(
	permRepo *repository.PermissionRepository,
	resourceRepo *repository.ResourcePermissionRepository,
	roleRepo *repository.RoleRepository,
	groupRepo *repository.UserGroupRepository,
) *PermissionService {
	return &PermissionService{
		permRepo:     permRepo,
		resourceRepo: resourceRepo,
		roleRepo:     roleRepo,
		groupRepo:    groupRepo,
		cache:        newPermissionCache(5 * time.Minute),
	}
}

// GetUserPermissions 获取用户的所有权限（角色权限 + 分组权限）
func (s *PermissionService) GetUserPermissions(userID uuid.UUID) ([]model.Permission, error) {
	// 获取用户直接角色的权限
	rolePerms, err := s.permRepo.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	// 获取用户所属分组的角色权限
	var groupPerms []model.Permission
	if s.groupRepo != nil {
		groupPerms, _ = s.groupRepo.GetPermissionsByUserID(userID)
	}

	// 合并去重
	return mergePermissions(rolePerms, groupPerms), nil
}

// GetUserPermissionCodes 获取用户的权限编码列表
func (s *PermissionService) GetUserPermissionCodes(userID uuid.UUID) ([]string, error) {
	perms, err := s.GetUserPermissions(userID)
	if err != nil {
		return nil, err
	}

	codes := make([]string, 0, len(perms))
	for _, p := range perms {
		codes = append(codes, p.Code)
	}
	return codes, nil
}

// HasPermission 检查用户是否有指定权限
func (s *PermissionService) HasPermission(userID uuid.UUID, permCode string) bool {
	// 先检查缓存
	if hasPerm, ok := s.cache.Get(userID, permCode); ok {
		return hasPerm
	}

	// 加载用户所有权限到缓存
	perms, err := s.GetUserPermissions(userID)
	if err != nil {
		return false
	}

	codes := make(map[string]bool)
	for _, p := range perms {
		codes[p.Code] = true
	}
	s.cache.Set(userID, codes)

	return codes[permCode]
}

// HasAnyPermission 检查用户是否有任意一个权限
func (s *PermissionService) HasAnyPermission(userID uuid.UUID, permCodes ...string) bool {
	for _, code := range permCodes {
		if s.HasPermission(userID, code) {
			return true
		}
	}
	return false
}

// HasAllPermissions 检查用户是否拥有所有权限
func (s *PermissionService) HasAllPermissions(userID uuid.UUID, permCodes ...string) bool {
	for _, code := range permCodes {
		if !s.HasPermission(userID, code) {
			return false
		}
	}
	return true
}

// HasResourcePermission 检查用户对特定资源的操作权限
func (s *PermissionService) HasResourcePermission(userID uuid.UUID, resourceType, resourceID, action string) bool {
	// 获取用户的所有角色ID
	roleIDs, err := s.GetUserRoleIDs(userID)
	if err != nil || len(roleIDs) == 0 {
		return false
	}

	// 获取这些角色对该资源类型的权限
	perms, err := s.resourceRepo.GetByRolesAndResourceType(roleIDs, resourceType)
	if err != nil {
		return false
	}

	var resID *uuid.UUID
	if resourceID != "" {
		id, err := uuid.Parse(resourceID)
		if err == nil {
			resID = &id
		}
	}

	for _, perm := range perms {
		// 检查是否匹配资源
		if perm.ResourceID != nil && resID != nil && *perm.ResourceID != *resID {
			continue
		}
		// 如果权限没有指定资源ID，则对该类型所有资源有效

		// 检查操作权限
		actions := parseActions(perm.Actions)
		if contains(actions, action) || contains(actions, "*") {
			return true
		}
	}

	return false
}

// GetUserRoleIDs 获取用户的所有角色ID（直接角色 + 分组角色）
func (s *PermissionService) GetUserRoleIDs(userID uuid.UUID) ([]uuid.UUID, error) {
	roleIDs := make([]uuid.UUID, 0)
	seen := make(map[uuid.UUID]bool)

	// 获取用户直接角色
	user, err := s.roleRepo.GetUserWithRole(userID)
	if err == nil && user.RoleID != uuid.Nil {
		roleIDs = append(roleIDs, user.RoleID)
		seen[user.RoleID] = true
	}

	// 获取用户分组的角色
	if s.groupRepo != nil {
		groupRoleIDs, _ := s.groupRepo.GetRoleIDsByUserID(userID)
		for _, rid := range groupRoleIDs {
			if !seen[rid] {
				roleIDs = append(roleIDs, rid)
				seen[rid] = true
			}
		}
	}

	return roleIDs, nil
}

// GetRequiredPermission 根据API路径获取所需权限
func (s *PermissionService) GetRequiredPermission(path, method string) *model.Permission {
	perm, err := s.permRepo.GetByPath(path, method)
	if err != nil {
		return nil
	}
	return perm
}

// InvalidateUserCache 使用户权限缓存失效
func (s *PermissionService) InvalidateUserCache(userID uuid.UUID) {
	s.cache.Invalidate(userID)
}

// InvalidateAllCache 使所有缓存失效
func (s *PermissionService) InvalidateAllCache() {
	s.cache.InvalidateAll()
}

// --- 权限管理 CRUD ---

// CreatePermission 创建权限
func (s *PermissionService) CreatePermission(perm *model.Permission) error {
	return s.permRepo.Create(perm)
}

// UpdatePermission 更新权限
func (s *PermissionService) UpdatePermission(perm *model.Permission) error {
	s.cache.InvalidateAll()
	return s.permRepo.Update(perm)
}

// DeletePermission 删除权限
func (s *PermissionService) DeletePermission(id uuid.UUID) error {
	s.cache.InvalidateAll()
	return s.permRepo.Delete(id)
}

// ListPermissions 列出所有权限
func (s *PermissionService) ListPermissions() ([]model.Permission, error) {
	return s.permRepo.List()
}

// GetPermissionTree 获取权限树结构
func (s *PermissionService) GetPermissionTree() ([]PermissionNode, error) {
	perms, err := s.permRepo.List()
	if err != nil {
		return nil, err
	}
	return buildPermissionTree(perms), nil
}

// UpdateRolePermissions 更新角色权限
func (s *PermissionService) UpdateRolePermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	s.cache.InvalidateAll()
	return s.permRepo.UpdateRolePermissions(roleID, permissionIDs)
}

// GetRolePermissions 获取角色权限
func (s *PermissionService) GetRolePermissions(roleID uuid.UUID) ([]model.Permission, error) {
	return s.permRepo.GetByRoleID(roleID)
}

// --- 资源权限管理 ---

// CreateResourcePermission 创建资源权限
func (s *PermissionService) CreateResourcePermission(rp *model.ResourcePermission) error {
	return s.resourceRepo.Create(rp)
}

// UpdateResourcePermission 更新资源权限
func (s *PermissionService) UpdateResourcePermission(rp *model.ResourcePermission) error {
	return s.resourceRepo.Update(rp)
}

// DeleteResourcePermission 删除资源权限
func (s *PermissionService) DeleteResourcePermission(id uuid.UUID) error {
	return s.resourceRepo.Delete(id)
}

// ListResourcePermissions 列出资源权限
func (s *PermissionService) ListResourcePermissions(page, pageSize int, roleID *uuid.UUID, resourceType string) ([]model.ResourcePermission, int64, error) {
	return s.resourceRepo.List(page, pageSize, roleID, resourceType)
}

// --- 辅助结构和函数 ---

type PermissionNode struct {
	model.Permission
	Children []PermissionNode `json:"children,omitempty"`
}

func buildPermissionTree(perms []model.Permission) []PermissionNode {
	nodeMap := make(map[uuid.UUID]*PermissionNode)
	var roots []PermissionNode

	// 先创建所有节点
	for _, p := range perms {
		node := PermissionNode{Permission: p}
		nodeMap[p.ID] = &node
	}

	// 构建树结构
	for _, p := range perms {
		node := nodeMap[p.ID]
		if p.ParentID == nil {
			roots = append(roots, *node)
		} else if parent, ok := nodeMap[*p.ParentID]; ok {
			parent.Children = append(parent.Children, *node)
		} else {
			roots = append(roots, *node)
		}
	}

	return roots
}

func mergePermissions(a, b []model.Permission) []model.Permission {
	seen := make(map[uuid.UUID]bool)
	result := make([]model.Permission, 0, len(a)+len(b))

	for _, p := range a {
		if !seen[p.ID] {
			seen[p.ID] = true
			result = append(result, p)
		}
	}
	for _, p := range b {
		if !seen[p.ID] {
			seen[p.ID] = true
			result = append(result, p)
		}
	}
	return result
}

func parseActions(actionsJSON string) []string {
	var actions []string
	if err := json.Unmarshal([]byte(actionsJSON), &actions); err != nil {
		// 尝试按逗号分隔
		return strings.Split(actionsJSON, ",")
	}
	return actions
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.TrimSpace(s) == item {
			return true
		}
	}
	return false
}
