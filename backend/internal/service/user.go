package service

import (
	"fmt"
	"time"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	userRepo *repository.UserRepository
	roleRepo *repository.RoleRepository
}

func NewUserService(userRepo *repository.UserRepository, roleRepo *repository.RoleRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
		roleRepo: roleRepo,
	}
}

type CreateUserRequest struct {
	Username string    `json:"username" binding:"required,min=3,max=50"`
	Password string    `json:"password" binding:"required,min=6"`
	Email    string    `json:"email" binding:"required,email"`
	RealName string    `json:"real_name"`
	Phone    string    `json:"phone"`
	RoleID   uuid.UUID `json:"role_id" binding:"required"`
}

func (s *UserService) Create(req *CreateUserRequest) (*model.User, error) {
	// Check if username exists
	if _, err := s.userRepo.GetByUsername(req.Username); err == nil {
		return nil, ErrUsernameExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username: req.Username,
		Password: string(hashedPassword),
		Email:    req.Email,
		RealName: req.RealName,
		Phone:    req.Phone,
		RoleID:   req.RoleID,
		Status:   1,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return s.userRepo.GetByID(user.ID)
}

type UpdateUserRequest struct {
	Email    string     `json:"email"`
	RealName string     `json:"real_name"`
	Phone    string     `json:"phone"`
	RoleID   *uuid.UUID `json:"role_id"`
	Status   *int       `json:"status"`
}

func (s *UserService) Update(id uuid.UUID, req *UpdateUserRequest) (*model.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.RealName != "" {
		user.RealName = req.RealName
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.RoleID != nil {
		user.RoleID = *req.RoleID
	}
	if req.Status != nil {
		user.Status = *req.Status
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return s.userRepo.GetByID(id)
}

func (s *UserService) Delete(id uuid.UUID) error {
	return s.userRepo.Delete(id)
}

func (s *UserService) GetByID(id uuid.UUID) (*model.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *UserService) List(page, pageSize int, keyword string) ([]model.User, int64, error) {
	return s.userRepo.List(page, pageSize, keyword)
}

func (s *UserService) ResetPassword(id uuid.UUID, newPassword string) error {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return ErrUserNotFound
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Password = string(hashedPassword)
	return s.userRepo.Update(user)
}

// Role service
type RoleService struct {
	roleRepo *repository.RoleRepository
	permRepo *repository.PermissionRepository
}

func NewRoleService(roleRepo *repository.RoleRepository, permRepo *repository.PermissionRepository) *RoleService {
	return &RoleService{
		roleRepo: roleRepo,
		permRepo: permRepo,
	}
}

func (s *RoleService) List() ([]model.Role, error) {
	return s.roleRepo.List()
}

func (s *RoleService) ListWithPermissions() ([]model.Role, error) {
	return s.roleRepo.ListWithPermissions()
}

func (s *RoleService) GetByID(id uuid.UUID) (*model.Role, error) {
	return s.roleRepo.GetByID(id)
}

func (s *RoleService) Create(name, description string) (*model.Role, error) {
	// 自动生成编码
	code := generateRoleCode(name)
	role := &model.Role{
		Name:        name,
		Code:        code,
		Description: description,
	}
	if err := s.roleRepo.Create(role); err != nil {
		return nil, err
	}
	return s.roleRepo.GetByID(role.ID)
}

func generateRoleCode(name string) string {
	// 简单生成：使用时间戳 + 随机数
	return fmt.Sprintf("role_%d", time.Now().UnixNano()/1000000)
}

func (s *RoleService) Update(id uuid.UUID, name, description string) (*model.Role, error) {
	role, err := s.roleRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if name != "" {
		role.Name = name
	}
	if description != "" {
		role.Description = description
	}
	if err := s.roleRepo.Update(role); err != nil {
		return nil, err
	}
	return s.roleRepo.GetByID(id)
}

func (s *RoleService) Delete(id uuid.UUID) error {
	return s.roleRepo.Delete(id)
}

func (s *RoleService) GetPermissions(roleID uuid.UUID) ([]model.Permission, error) {
	return s.permRepo.GetByRoleID(roleID)
}

func (s *RoleService) SetPermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	return s.permRepo.UpdateRolePermissions(roleID, permissionIDs)
}

func (s *RoleService) GetAllPermissions() ([]model.Permission, error) {
	return s.permRepo.List()
}
