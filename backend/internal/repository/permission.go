package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PermissionRepository struct {
	db *gorm.DB
}

func NewPermissionRepository(db *gorm.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

func (r *PermissionRepository) Create(permission *model.Permission) error {
	return r.db.Create(permission).Error
}

func (r *PermissionRepository) GetByID(id uuid.UUID) (*model.Permission, error) {
	var permission model.Permission
	if err := r.db.First(&permission, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *PermissionRepository) GetByCode(code string) (*model.Permission, error) {
	var permission model.Permission
	if err := r.db.First(&permission, "code = ?", code).Error; err != nil {
		return nil, err
	}
	return &permission, nil
}

func (r *PermissionRepository) Update(permission *model.Permission) error {
	return r.db.Save(permission).Error
}

func (r *PermissionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Permission{}, "id = ?", id).Error
}

// List 返回所有启用的权限
func (r *PermissionRepository) List() ([]model.Permission, error) {
	var permissions []model.Permission
	if err := r.db.Where("status = ?", 1).Order("sort ASC").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// GetByRoleID 获取角色的所有权限
func (r *PermissionRepository) GetByRoleID(roleID uuid.UUID) ([]model.Permission, error) {
	var role model.Role
	if err := r.db.Preload("Permissions").First(&role, "id = ?", roleID).Error; err != nil {
		return nil, err
	}
	return role.Permissions, nil
}

// GetByUserID 获取用户的所有权限（通过角色）
func (r *PermissionRepository) GetByUserID(userID uuid.UUID) ([]model.Permission, error) {
	var user model.User
	if err := r.db.Preload("Role.Permissions").First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	if user.Role == nil {
		return []model.Permission{}, nil
	}
	return user.Role.Permissions, nil
}

// GetByPath 根据API路径和方法获取权限
func (r *PermissionRepository) GetByPath(path, method string) (*model.Permission, error) {
	var permission model.Permission
	query := r.db.Where("path = ? AND status = 1", path)
	if method != "" {
		query = query.Where("method LIKE ?", "%"+method+"%")
	}
	if err := query.First(&permission).Error; err != nil {
		return nil, err
	}
	return &permission, nil
}

// GetByResource 根据资源类型获取权限列表
func (r *PermissionRepository) GetByResource(resource string) ([]model.Permission, error) {
	var permissions []model.Permission
	if err := r.db.Where("resource = ? AND status = 1", resource).Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// BatchCreate 批量创建权限
func (r *PermissionRepository) BatchCreate(permissions []model.Permission) error {
	return r.db.CreateInBatches(permissions, 100).Error
}

// UpdateRolePermissions 更新角色权限
func (r *PermissionRepository) UpdateRolePermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	var role model.Role
	if err := r.db.First(&role, "id = ?", roleID).Error; err != nil {
		return err
	}

	var permissions []model.Permission
	if len(permissionIDs) > 0 {
		if err := r.db.Where("id IN ?", permissionIDs).Find(&permissions).Error; err != nil {
			return err
		}
	}

	return r.db.Model(&role).Association("Permissions").Replace(permissions)
}

// ResourcePermissionRepository 资源权限仓库
type ResourcePermissionRepository struct {
	db *gorm.DB
}

func NewResourcePermissionRepository(db *gorm.DB) *ResourcePermissionRepository {
	return &ResourcePermissionRepository{db: db}
}

func (r *ResourcePermissionRepository) Create(rp *model.ResourcePermission) error {
	return r.db.Create(rp).Error
}

func (r *ResourcePermissionRepository) GetByID(id uuid.UUID) (*model.ResourcePermission, error) {
	var rp model.ResourcePermission
	if err := r.db.First(&rp, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &rp, nil
}

func (r *ResourcePermissionRepository) Update(rp *model.ResourcePermission) error {
	return r.db.Save(rp).Error
}

func (r *ResourcePermissionRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ResourcePermission{}, "id = ?", id).Error
}

// GetByRoleID 获取角色的资源权限
func (r *ResourcePermissionRepository) GetByRoleID(roleID uuid.UUID) ([]model.ResourcePermission, error) {
	var perms []model.ResourcePermission
	if err := r.db.Where("role_id = ?", roleID).Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

// GetByRoleAndResource 获取角色对特定资源的权限
func (r *ResourcePermissionRepository) GetByRoleAndResource(roleID uuid.UUID, resourceType string, resourceID *uuid.UUID) (*model.ResourcePermission, error) {
	var rp model.ResourcePermission
	query := r.db.Where("role_id = ? AND resource_type = ?", roleID, resourceType)
	if resourceID != nil {
		query = query.Where("resource_id = ?", resourceID)
	} else {
		query = query.Where("resource_id IS NULL")
	}
	if err := query.First(&rp).Error; err != nil {
		return nil, err
	}
	return &rp, nil
}

// GetByRolesAndResourceType 获取多个角色对某类资源的权限
func (r *ResourcePermissionRepository) GetByRolesAndResourceType(roleIDs []uuid.UUID, resourceType string) ([]model.ResourcePermission, error) {
	var perms []model.ResourcePermission
	if err := r.db.Where("role_id IN ? AND resource_type = ?", roleIDs, resourceType).Find(&perms).Error; err != nil {
		return nil, err
	}
	return perms, nil
}

// List 列出所有资源权限
func (r *ResourcePermissionRepository) List(page, pageSize int, roleID *uuid.UUID, resourceType string) ([]model.ResourcePermission, int64, error) {
	var perms []model.ResourcePermission
	var total int64

	query := r.db.Model(&model.ResourcePermission{})
	if roleID != nil {
		query = query.Where("role_id = ?", roleID)
	}
	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&perms).Error; err != nil {
		return nil, 0, err
	}

	return perms, total, nil
}
