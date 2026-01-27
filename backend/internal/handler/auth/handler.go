package auth

import (
	"devops/internal/middleware"
	"devops/internal/pkg/response"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	authService *service.AuthService
}

func NewHandler(authService *service.AuthService) *Handler {
	return &Handler{authService: authService}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/login", h.Login)
	r.POST("/register", h.Register)
}

func (h *Handler) RegisterAuthRoutes(r *gin.RouterGroup) {
	r.GET("/me", h.GetCurrentUser)
	r.POST("/change-password", h.ChangePassword)
}

// @Summary User login
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body service.LoginRequest true "Login request"
// @Success 200 {object} response.Response{data=service.LoginResponse}
// @Router /api/v1/auth/login [post]
func (h *Handler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.authService.Login(&req)
	if err != nil {
		switch err {
		case service.ErrUserNotFound:
			response.Error(c, 1001, "用户不存在")
		case service.ErrInvalidPassword:
			response.Error(c, 1002, "密码错误")
		case service.ErrUserDisabled:
			response.Error(c, 1003, "用户已禁用")
		default:
			response.ServerError(c, err.Error())
		}
		return
	}

	response.Success(c, result)
}

// @Summary User register
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body service.RegisterRequest true "Register request"
// @Success 200 {object} response.Response
// @Router /api/v1/auth/register [post]
func (h *Handler) Register(c *gin.Context) {
	var req service.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.authService.Register(&req)
	if err != nil {
		switch err {
		case service.ErrUsernameExists:
			response.Error(c, 1004, "用户名已存在")
		case service.ErrEmailExists:
			response.Error(c, 1005, "邮箱已存在")
		default:
			response.ServerError(c, err.Error())
		}
		return
	}

	response.Success(c, user)
}

// @Summary Get current user info
// @Tags Auth
// @Security Bearer
// @Produce json
// @Success 200 {object} response.Response
// @Router /api/v1/auth/me [get]
func (h *Handler) GetCurrentUser(c *gin.Context) {
	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		response.Unauthorized(c, "未登录")
		return
	}

	user, err := h.authService.GetUserInfo(claims.UserID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, user)
}

// @Summary Change password
// @Tags Auth
// @Security Bearer
// @Accept json
// @Produce json
// @Success 200 {object} response.Response
// @Router /api/v1/auth/change-password [post]
func (h *Handler) ChangePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	claims := middleware.GetCurrentUser(c)
	if claims == nil {
		response.Unauthorized(c, "未登录")
		return
	}

	if err := h.authService.ChangePassword(claims.UserID, req.OldPassword, req.NewPassword); err != nil {
		if err == service.ErrInvalidPassword {
			response.Error(c, 1002, "原密码错误")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "密码修改成功", nil)
}
