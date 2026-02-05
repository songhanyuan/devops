package group

import (
	"devops/internal/middleware"
	"devops/internal/pkg/response"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	groupService *service.GroupService
}

func NewHandler(groupService *service.GroupService) *Handler {
	return &Handler{groupService: groupService}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	groups := r.Group("/user-groups")
	groups.Use(middleware.RequireAdmin())
	{
		groups.GET("", h.List)
		groups.GET("/tree", h.Tree)
		groups.POST("", h.Create)
		groups.GET("/:id", h.Get)
		groups.PUT("/:id", h.Update)
		groups.DELETE("/:id", h.Delete)
		groups.GET("/:id/members", h.GetMembers)
		groups.POST("/:id/members", h.AddMembers)
		groups.DELETE("/:id/members/:userId", h.RemoveMember)
		groups.PUT("/:id/roles", h.SetRoles)
	}
}

// List 分组列表
func (h *Handler) List(c *gin.Context) {
	page := parseIntParam(c, "page", 1)
	pageSize := parseIntParam(c, "page_size", 20)
	keyword := c.Query("keyword")

	groups, total, err := h.groupService.List(page, pageSize, keyword)
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}

	response.SuccessPage(c, groups, total, page, pageSize)
}

// Tree 分组树
func (h *Handler) Tree(c *gin.Context) {
	tree, err := h.groupService.GetTree()
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}
	response.Success(c, tree)
}

// Get 获取分组详情
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	group, err := h.groupService.GetByID(id)
	if err != nil {
		response.NotFound(c, "分组不存在")
		return
	}

	response.Success(c, group)
}

// Create 创建分组
func (h *Handler) Create(c *gin.Context) {
	var req service.CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	user := middleware.GetCurrentUser(c)
	if user == nil {
		response.Unauthorized(c, "未登录")
		return
	}

	group, err := h.groupService.Create(&req, user.UserID)
	if err != nil {
		response.Error(c, 500, "创建失败: "+err.Error())
		return
	}

	response.Success(c, group)
}

// Update 更新分组
func (h *Handler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req service.UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	group, err := h.groupService.Update(id, &req)
	if err != nil {
		if err == service.ErrGroupNotFound {
			response.NotFound(c, err.Error())
		} else {
			response.Error(c, 500, "更新失败: "+err.Error())
		}
		return
	}

	response.Success(c, group)
}

// Delete 删除分组
func (h *Handler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	if err := h.groupService.Delete(id); err != nil {
		if err == service.ErrGroupNotFound {
			response.NotFound(c, err.Error())
		} else {
			response.Error(c, 500, "删除失败: "+err.Error())
		}
		return
	}

	response.Success(c, nil)
}

// GetMembers 获取分组成员
func (h *Handler) GetMembers(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	members, err := h.groupService.GetMembers(id)
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}

	response.Success(c, members)
}

// AddMembers 添加成员
func (h *Handler) AddMembers(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req struct {
		UserIDs []uuid.UUID `json:"user_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := h.groupService.AddMembers(id, req.UserIDs); err != nil {
		if err == service.ErrGroupNotFound {
			response.NotFound(c, err.Error())
		} else {
			response.Error(c, 500, "添加失败: "+err.Error())
		}
		return
	}

	response.Success(c, nil)
}

// RemoveMember 移除成员
func (h *Handler) RemoveMember(c *gin.Context) {
	groupID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的分组ID")
		return
	}

	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		response.BadRequest(c, "无效的用户ID")
		return
	}

	if err := h.groupService.RemoveMember(groupID, userID); err != nil {
		response.Error(c, 500, "移除失败: "+err.Error())
		return
	}

	response.Success(c, nil)
}

// SetRoles 设置分组角色
func (h *Handler) SetRoles(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req struct {
		RoleIDs []uuid.UUID `json:"role_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	if err := h.groupService.SetRoles(id, req.RoleIDs); err != nil {
		if err == service.ErrGroupNotFound {
			response.NotFound(c, err.Error())
		} else {
			response.Error(c, 500, "设置失败: "+err.Error())
		}
		return
	}

	response.Success(c, nil)
}

func parseIntParam(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	var n int
	for _, ch := range val {
		if ch < '0' || ch > '9' {
			return defaultVal
		}
		n = n*10 + int(ch-'0')
	}
	return n
}
