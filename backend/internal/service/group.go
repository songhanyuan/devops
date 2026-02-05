package service

import (
	"errors"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrGroupNotFound = errors.New("分组不存在")
)

type GroupService struct {
	groupRepo *repository.UserGroupRepository
}

func NewGroupService(groupRepo *repository.UserGroupRepository) *GroupService {
	return &GroupService{groupRepo: groupRepo}
}

type CreateGroupRequest struct {
	Name        string     `json:"name" binding:"required"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
}

type UpdateGroupRequest struct {
	Name        string     `json:"name"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
}

// Create 创建分组
func (s *GroupService) Create(req *CreateGroupRequest, createdBy uuid.UUID) (*model.UserGroup, error) {
	group := &model.UserGroup{
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		CreatedBy:   createdBy,
	}

	if err := s.groupRepo.Create(group); err != nil {
		return nil, err
	}

	return s.groupRepo.GetByID(group.ID)
}

// Update 更新分组
func (s *GroupService) Update(id uuid.UUID, req *UpdateGroupRequest) (*model.UserGroup, error) {
	group, err := s.groupRepo.GetByID(id)
	if err != nil {
		return nil, ErrGroupNotFound
	}

	if req.Name != "" {
		group.Name = req.Name
	}
	if req.Description != "" {
		group.Description = req.Description
	}
	group.ParentID = req.ParentID

	if err := s.groupRepo.Update(group); err != nil {
		return nil, err
	}

	return s.groupRepo.GetByID(id)
}

// Delete 删除分组
func (s *GroupService) Delete(id uuid.UUID) error {
	if _, err := s.groupRepo.GetByID(id); err != nil {
		return ErrGroupNotFound
	}
	return s.groupRepo.Delete(id)
}

// GetByID 获取分组详情
func (s *GroupService) GetByID(id uuid.UUID) (*model.UserGroup, error) {
	return s.groupRepo.GetByID(id)
}

// List 分页列出分组
func (s *GroupService) List(page, pageSize int, keyword string) ([]model.UserGroup, int64, error) {
	return s.groupRepo.List(page, pageSize, keyword)
}

// GetTree 获取分组树
func (s *GroupService) GetTree() ([]repository.GroupNode, error) {
	return s.groupRepo.GetTree()
}

// AddMembers 添加成员
func (s *GroupService) AddMembers(groupID uuid.UUID, userIDs []uuid.UUID) error {
	if _, err := s.groupRepo.GetByID(groupID); err != nil {
		return ErrGroupNotFound
	}
	return s.groupRepo.AddUsers(groupID, userIDs)
}

// RemoveMember 移除成员
func (s *GroupService) RemoveMember(groupID, userID uuid.UUID) error {
	return s.groupRepo.RemoveUser(groupID, userID)
}

// SetRoles 设置分组角色
func (s *GroupService) SetRoles(groupID uuid.UUID, roleIDs []uuid.UUID) error {
	if _, err := s.groupRepo.GetByID(groupID); err != nil {
		return ErrGroupNotFound
	}
	return s.groupRepo.SetRoles(groupID, roleIDs)
}

// GetMembers 获取分组成员
func (s *GroupService) GetMembers(groupID uuid.UUID) ([]model.User, error) {
	return s.groupRepo.GetUsersByGroupID(groupID)
}

// GetUserGroups 获取用户所属分组
func (s *GroupService) GetUserGroups(userID uuid.UUID) ([]model.UserGroup, error) {
	return s.groupRepo.GetByUserID(userID)
}
