package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

func (r *RoleRepository) Create(role *model.Role) error {
	return r.db.Create(role).Error
}

func (r *RoleRepository) GetByID(id uuid.UUID) (*model.Role, error) {
	var role model.Role
	err := r.db.Preload("Permissions").First(&role, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepository) GetByCode(code string) (*model.Role, error) {
	var role model.Role
	err := r.db.Preload("Permissions").First(&role, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *RoleRepository) Update(role *model.Role) error {
	return r.db.Save(role).Error
}

func (r *RoleRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Role{}, "id = ?", id).Error
}

func (r *RoleRepository) List() ([]model.Role, error) {
	var roles []model.Role
	err := r.db.Order("created_at ASC").Find(&roles).Error
	return roles, err
}

func (r *RoleRepository) ListWithPermissions() ([]model.Role, error) {
	var roles []model.Role
	err := r.db.Preload("Permissions").Order("created_at ASC").Find(&roles).Error
	return roles, err
}

func (r *RoleRepository) UpdatePermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	role, err := r.GetByID(roleID)
	if err != nil {
		return err
	}

	var permissions []model.Permission
	if len(permissionIDs) > 0 {
		if err := r.db.Find(&permissions, "id IN ?", permissionIDs).Error; err != nil {
			return err
		}
	}

	return r.db.Model(role).Association("Permissions").Replace(permissions)
}

// GetUserWithRole 获取用户及其角色信息
func (r *RoleRepository) GetUserWithRole(userID uuid.UUID) (*model.User, error) {
	var user model.User
	if err := r.db.Preload("Role").First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Initialize default roles
func (r *RoleRepository) InitDefaultRoles() error {
	roles := []model.Role{
		{Name: "超级管理员", Code: "admin", Description: "拥有所有权限"},
		{Name: "运维人员", Code: "operator", Description: "运维操作权限"},
		{Name: "开发人员", Code: "develop", Description: "开发相关权限"},
		{Name: "只读用户", Code: "viewer", Description: "只读权限"},
	}

	for _, role := range roles {
		var existing model.Role
		if err := r.db.First(&existing, "code = ?", role.Code).Error; err == gorm.ErrRecordNotFound {
			if err := r.db.Create(&role).Error; err != nil {
				return err
			}
		}
	}

	return nil
}
