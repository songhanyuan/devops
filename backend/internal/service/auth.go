package service

import (
	"errors"

	"devops/internal/model"
	"devops/internal/pkg/jwt"
	"devops/internal/repository"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidPassword   = errors.New("invalid password")
	ErrUserDisabled      = errors.New("user is disabled")
	ErrUsernameExists    = errors.New("username already exists")
	ErrEmailExists       = errors.New("email already exists")
)

type AuthService struct {
	userRepo *repository.UserRepository
	roleRepo *repository.RoleRepository
	jwt      *jwt.JWTManager
}

func NewAuthService(userRepo *repository.UserRepository, roleRepo *repository.RoleRepository, jwtManager *jwt.JWTManager) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		roleRepo: roleRepo,
		jwt:      jwtManager,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token    string      `json:"token"`
	User     *model.User `json:"user"`
}

func (s *AuthService) Login(req *LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if user.Status != 1 {
		return nil, ErrUserDisabled
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidPassword
	}

	roleCode := ""
	if user.Role != nil {
		roleCode = user.Role.Code
	}

	token, err := s.jwt.GenerateToken(user.ID, user.Username, roleCode)
	if err != nil {
		return nil, err
	}

	s.userRepo.UpdateLastLogin(user.ID)

	return &LoginResponse{
		Token: token,
		User:  user,
	}, nil
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email" binding:"required,email"`
	RealName string `json:"real_name"`
	Phone    string `json:"phone"`
}

func (s *AuthService) Register(req *RegisterRequest) (*model.User, error) {
	// Check if username exists
	if _, err := s.userRepo.GetByUsername(req.Username); err == nil {
		return nil, ErrUsernameExists
	}

	// Check if email exists
	if _, err := s.userRepo.GetByEmail(req.Email); err == nil {
		return nil, ErrEmailExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Get default role (viewer)
	role, err := s.roleRepo.GetByCode("viewer")
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Username: req.Username,
		Password: string(hashedPassword),
		Email:    req.Email,
		RealName: req.RealName,
		Phone:    req.Phone,
		RoleID:   role.ID,
		Status:   1,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	user.Role = role
	return user, nil
}

func (s *AuthService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return ErrUserNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword)); err != nil {
		return ErrInvalidPassword
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.Password = string(hashedPassword)
	return s.userRepo.Update(user)
}

func (s *AuthService) GetUserInfo(userID uuid.UUID) (*model.User, error) {
	return s.userRepo.GetByID(userID)
}

// Initialize admin user
func (s *AuthService) InitAdminUser() error {
	// Check if admin exists
	if _, err := s.userRepo.GetByUsername("admin"); err == nil {
		return nil
	}

	// Get admin role
	role, err := s.roleRepo.GetByCode("admin")
	if err != nil {
		return err
	}

	// Create admin user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := &model.User{
		Username: "admin",
		Password: string(hashedPassword),
		Email:    "admin@devops.local",
		RealName: "Administrator",
		RoleID:   role.ID,
		Status:   1,
	}

	return s.userRepo.Create(admin)
}
