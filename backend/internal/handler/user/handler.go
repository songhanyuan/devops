package user

import (
	"strconv"

	"devops/internal/middleware"
	"devops/internal/pkg/response"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	userService *service.UserService
	roleService *service.RoleService
}

func NewHandler(userService *service.UserService, roleService *service.RoleService) *Handler {
	return &Handler{
		userService: userService,
		roleService: roleService,
	}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	users := r.Group("/users")
	users.Use(middleware.RequireAdmin())
	{
		users.GET("", h.List)
		users.POST("", h.Create)
		users.GET("/:id", h.Get)
		users.PUT("/:id", h.Update)
		users.DELETE("/:id", h.Delete)
		users.POST("/:id/reset-password", h.ResetPassword)
	}

	roles := r.Group("/roles")
	{
		roles.GET("", h.ListRoles)
	}
}

func (h *Handler) List(c *gin.Context) {
	page := getIntParam(c, "page", 1)
	pageSize := getIntParam(c, "page_size", 20)
	keyword := c.Query("keyword")

	users, total, err := h.userService.List(page, pageSize, keyword)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessPage(c, users, total, page, pageSize)
}

func (h *Handler) Create(c *gin.Context) {
	var req service.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.userService.Create(&req)
	if err != nil {
		if err == service.ErrUsernameExists {
			response.Error(c, 4001, "用户名已存在")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, user)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	user, err := h.userService.GetByID(id)
	if err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	response.Success(c, user)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req service.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	user, err := h.userService.Update(id, &req)
	if err != nil {
		if err == service.ErrUserNotFound {
			response.NotFound(c, "用户不存在")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, user)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	// Prevent deleting self
	claims := middleware.GetCurrentUser(c)
	if claims.UserID == id {
		response.Error(c, 4002, "不能删除自己")
		return
	}

	if err := h.userService.Delete(id); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

func (h *Handler) ResetPassword(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req struct {
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.userService.ResetPassword(id, req.Password); err != nil {
		if err == service.ErrUserNotFound {
			response.NotFound(c, "用户不存在")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "密码重置成功", nil)
}

func (h *Handler) ListRoles(c *gin.Context) {
	roles, err := h.roleService.List()
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, roles)
}

func getIntParam(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	if n, err := strconv.Atoi(val); err == nil {
		return n
	}
	return defaultVal
}
