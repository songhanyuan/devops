package user

import (
	"strconv"

	"devops/internal/middleware"
	"devops/internal/model"
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
		roles.GET("/:id", h.GetRole)
		roles.POST("", middleware.RequireAdmin(), h.CreateRole)
		roles.PUT("/:id", middleware.RequireAdmin(), h.UpdateRole)
		roles.DELETE("/:id", middleware.RequireAdmin(), h.DeleteRole)
		roles.GET("/:id/permissions", h.GetRolePermissions)
		roles.PUT("/:id/permissions", middleware.RequireAdmin(), h.SetRolePermissions)
	}

	permissions := r.Group("/permissions")
	{
		permissions.GET("", h.ListPermissions)
		permissions.GET("/tree", h.GetPermissionTree)
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
	withPerms := c.Query("with_permissions") == "true"
	var roles interface{}
	var err error

	if withPerms {
		roles, err = h.roleService.ListWithPermissions()
	} else {
		roles, err = h.roleService.List()
	}

	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, roles)
}

func (h *Handler) GetRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	role, err := h.roleService.GetByID(id)
	if err != nil {
		response.NotFound(c, "角色不存在")
		return
	}

	response.Success(c, role)
}

func (h *Handler) CreateRole(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	role, err := h.roleService.Create(req.Name, req.Description)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, role)
}

func (h *Handler) UpdateRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	role, err := h.roleService.Update(id, req.Name, req.Description)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, role)
}

func (h *Handler) DeleteRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	if err := h.roleService.Delete(id); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *Handler) GetRolePermissions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	permissions, err := h.roleService.GetPermissions(id)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, permissions)
}

func (h *Handler) SetRolePermissions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req struct {
		PermissionIDs []uuid.UUID `json:"permission_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := h.roleService.SetPermissions(id, req.PermissionIDs); err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, nil)
}

func (h *Handler) ListPermissions(c *gin.Context) {
	permissions, err := h.roleService.GetAllPermissions()
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, permissions)
}

func (h *Handler) GetPermissionTree(c *gin.Context) {
	permissions, err := h.roleService.GetAllPermissions()
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	// 构建树结构
	tree := buildPermissionTree(permissions)
	response.Success(c, tree)
}

type PermissionNode struct {
	ID       uuid.UUID         `json:"id"`
	Name     string            `json:"name"`
	Code     string            `json:"code"`
	Type     string            `json:"type"`
	Resource string            `json:"resource"`
	Action   string            `json:"action"`
	ParentID *uuid.UUID        `json:"parent_id"`
	Children []*PermissionNode `json:"children,omitempty"`
}

func buildPermissionTree(permissions []model.Permission) []*PermissionNode {
	nodeMap := make(map[uuid.UUID]*PermissionNode)
	var roots []*PermissionNode

	// 创建节点
	for _, p := range permissions {
		node := &PermissionNode{
			ID:       p.ID,
			Name:     p.Name,
			Code:     p.Code,
			Type:     p.Type,
			Resource: p.Resource,
			Action:   p.Action,
			ParentID: p.ParentID,
		}
		nodeMap[p.ID] = node
	}

	// 建立关系
	for _, p := range permissions {
		node := nodeMap[p.ID]
		if p.ParentID == nil {
			roots = append(roots, node)
		} else if parent, ok := nodeMap[*p.ParentID]; ok {
			parent.Children = append(parent.Children, node)
		} else {
			roots = append(roots, node)
		}
	}

	return roots
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
