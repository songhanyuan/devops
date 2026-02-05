package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserGroupRepository struct {
	db *gorm.DB
}

func NewUserGroupRepository(db *gorm.DB) *UserGroupRepository {
	return &UserGroupRepository{db: db}
}

func (r *UserGroupRepository) Create(group *model.UserGroup) error {
	return r.db.Create(group).Error
}

func (r *UserGroupRepository) GetByID(id uuid.UUID) (*model.UserGroup, error) {
	var group model.UserGroup
	if err := r.db.Preload("Users").Preload("Roles").First(&group, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &group, nil
}

func (r *UserGroupRepository) Update(group *model.UserGroup) error {
	return r.db.Save(group).Error
}

func (r *UserGroupRepository) Delete(id uuid.UUID) error {
	// 先删除关联
	r.db.Exec("DELETE FROM user_group_members WHERE user_group_id = ?", id)
	r.db.Exec("DELETE FROM user_group_roles WHERE user_group_id = ?", id)
	return r.db.Delete(&model.UserGroup{}, "id = ?", id).Error
}

// List 分页列出分组
func (r *UserGroupRepository) List(page, pageSize int, keyword string) ([]model.UserGroup, int64, error) {
	var groups []model.UserGroup
	var total int64

	query := r.db.Model(&model.UserGroup{})
	if keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("Users").Preload("Roles").Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&groups).Error; err != nil {
		return nil, 0, err
	}

	return groups, total, nil
}

// GetAll 获取所有分组
func (r *UserGroupRepository) GetAll() ([]model.UserGroup, error) {
	var groups []model.UserGroup
	if err := r.db.Find(&groups).Error; err != nil {
		return nil, err
	}
	return groups, nil
}

// AddUsers 添加用户到分组
func (r *UserGroupRepository) AddUsers(groupID uuid.UUID, userIDs []uuid.UUID) error {
	var group model.UserGroup
	if err := r.db.First(&group, "id = ?", groupID).Error; err != nil {
		return err
	}

	var users []model.User
	if len(userIDs) > 0 {
		if err := r.db.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
			return err
		}
	}

	return r.db.Model(&group).Association("Users").Append(users)
}

// RemoveUser 从分组移除用户
func (r *UserGroupRepository) RemoveUser(groupID, userID uuid.UUID) error {
	return r.db.Exec("DELETE FROM user_group_members WHERE user_group_id = ? AND user_id = ?", groupID, userID).Error
}

// SetRoles 设置分组的角色
func (r *UserGroupRepository) SetRoles(groupID uuid.UUID, roleIDs []uuid.UUID) error {
	var group model.UserGroup
	if err := r.db.First(&group, "id = ?", groupID).Error; err != nil {
		return err
	}

	var roles []model.Role
	if len(roleIDs) > 0 {
		if err := r.db.Where("id IN ?", roleIDs).Find(&roles).Error; err != nil {
			return err
		}
	}

	return r.db.Model(&group).Association("Roles").Replace(roles)
}

// GetByUserID 获取用户所属的分组
func (r *UserGroupRepository) GetByUserID(userID uuid.UUID) ([]model.UserGroup, error) {
	var user model.User
	if err := r.db.Preload("Groups").First(&user, "id = ?", userID).Error; err != nil {
		return nil, err
	}
	return user.Groups, nil
}

// GetRoleIDsByUserID 获取用户通过分组获得的角色ID
func (r *UserGroupRepository) GetRoleIDsByUserID(userID uuid.UUID) ([]uuid.UUID, error) {
	var roleIDs []uuid.UUID
	err := r.db.Raw(`
		SELECT DISTINCT ugr.role_id
		FROM user_group_roles ugr
		INNER JOIN user_group_members ugm ON ugm.user_group_id = ugr.user_group_id
		WHERE ugm.user_id = ?
	`, userID).Scan(&roleIDs).Error
	return roleIDs, err
}

// GetPermissionsByUserID 获取用户通过分组获得的权限
func (r *UserGroupRepository) GetPermissionsByUserID(userID uuid.UUID) ([]model.Permission, error) {
	var permissions []model.Permission
	err := r.db.Raw(`
		SELECT DISTINCT p.*
		FROM permissions p
		INNER JOIN role_permissions rp ON rp.permission_id = p.id
		INNER JOIN user_group_roles ugr ON ugr.role_id = rp.role_id
		INNER JOIN user_group_members ugm ON ugm.user_group_id = ugr.user_group_id
		WHERE ugm.user_id = ? AND p.status = 1
	`, userID).Scan(&permissions).Error
	return permissions, err
}

// GetUsersByGroupID 获取分组内的所有用户
func (r *UserGroupRepository) GetUsersByGroupID(groupID uuid.UUID) ([]model.User, error) {
	var group model.UserGroup
	if err := r.db.Preload("Users").First(&group, "id = ?", groupID).Error; err != nil {
		return nil, err
	}
	return group.Users, nil
}

// GetTree 获取分组树结构
func (r *UserGroupRepository) GetTree() ([]GroupNode, error) {
	groups, err := r.GetAll()
	if err != nil {
		return nil, err
	}
	return buildGroupTree(groups), nil
}

type GroupNode struct {
	model.UserGroup
	Children []GroupNode `json:"children,omitempty"`
}

func buildGroupTree(groups []model.UserGroup) []GroupNode {
	nodeMap := make(map[uuid.UUID]*GroupNode)
	var roots []GroupNode

	for _, g := range groups {
		node := GroupNode{UserGroup: g}
		nodeMap[g.ID] = &node
	}

	for _, g := range groups {
		node := nodeMap[g.ID]
		if g.ParentID == nil {
			roots = append(roots, *node)
		} else if parent, ok := nodeMap[*g.ParentID]; ok {
			parent.Children = append(parent.Children, *node)
		} else {
			roots = append(roots, *node)
		}
	}

	return roots
}
