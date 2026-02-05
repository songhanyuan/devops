package middleware

import (
	"devops/internal/pkg/response"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
)

// Role codes
const (
	RoleAdmin    = "admin"
	RoleOperator = "operator"
	RoleDevelop  = "develop"
	RoleViewer   = "viewer"
)

// Permission check middleware
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		for _, role := range allowedRoles {
			if user.RoleCode == role {
				c.Next()
				return
			}
		}

		response.Forbidden(c, "insufficient permissions")
		c.Abort()
	}
}

// Admin only middleware
func RequireAdmin() gin.HandlerFunc {
	return RequireRole(RoleAdmin)
}

// Admin or operator middleware
func RequireOperator() gin.HandlerFunc {
	return RequireRole(RoleAdmin, RoleOperator)
}

// Admin, operator or developer middleware
func RequireDeveloper() gin.HandlerFunc {
	return RequireRole(RoleAdmin, RoleOperator, RoleDevelop)
}

// PermissionChecker 细粒度权限检查器
type PermissionChecker struct {
	permService *service.PermissionService
}

// NewPermissionChecker 创建权限检查器
func NewPermissionChecker(permService *service.PermissionService) *PermissionChecker {
	return &PermissionChecker{permService: permService}
}

// RequirePermission 检查用户是否有指定权限码
func (pc *PermissionChecker) RequirePermission(permCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		// Admin 绕过所有权限检查
		if user.RoleCode == RoleAdmin {
			c.Next()
			return
		}

		// 检查用户权限
		if !pc.permService.HasPermission(user.UserID, permCode) {
			response.Forbidden(c, "权限不足: "+permCode)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAnyPermission 检查用户是否有任意一个权限
func (pc *PermissionChecker) RequireAnyPermission(permCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		// Admin 绕过所有权限检查
		if user.RoleCode == RoleAdmin {
			c.Next()
			return
		}

		// 检查用户是否有任一权限
		if !pc.permService.HasAnyPermission(user.UserID, permCodes...) {
			response.Forbidden(c, "权限不足")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireResourcePermission 检查用户对特定资源的操作权限
func (pc *PermissionChecker) RequireResourcePermission(resourceType, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		// Admin 绕过所有权限检查
		if user.RoleCode == RoleAdmin {
			c.Next()
			return
		}

		// 从路径参数获取资源ID
		resourceID := c.Param("id")

		// 检查资源权限
		if !pc.permService.HasResourcePermission(user.UserID, resourceType, resourceID, action) {
			response.Forbidden(c, "无权操作此资源")
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequirePermissionOrRole 权限码或角色满足其一即可
func (pc *PermissionChecker) RequirePermissionOrRole(permCode string, roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		// 检查角色
		for _, role := range roles {
			if user.RoleCode == role {
				c.Next()
				return
			}
		}

		// 检查权限码
		if pc.permService.HasPermission(user.UserID, permCode) {
			c.Next()
			return
		}

		response.Forbidden(c, "权限不足")
		c.Abort()
	}
}

// DynamicPermissionCheck 根据 API 路径动态检查权限
func (pc *PermissionChecker) DynamicPermissionCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		// Admin 绕过所有权限检查
		if user.RoleCode == RoleAdmin {
			c.Next()
			return
		}

		path := c.FullPath()
		method := c.Request.Method

		// 查找该路径所需的权限
		perm := pc.permService.GetRequiredPermission(path, method)
		if perm == nil {
			// 未配置权限要求，默认放行（或改为默认拒绝）
			c.Next()
			return
		}

		// 检查用户是否有该权限
		if !pc.permService.HasPermission(user.UserID, perm.Code) {
			response.Forbidden(c, "权限不足")
			c.Abort()
			return
		}

		c.Next()
	}
}

// WritePermissionCheck 写操作权限检查（POST/PUT/DELETE）
func (pc *PermissionChecker) WritePermissionCheck(resourceType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetCurrentUser(c)
		if user == nil {
			response.Unauthorized(c, "user not authenticated")
			c.Abort()
			return
		}

		// Admin 绕过所有权限检查
		if user.RoleCode == RoleAdmin {
			c.Next()
			return
		}

		// 根据 HTTP 方法确定操作类型
		var action string
		switch c.Request.Method {
		case "POST":
			action = "create"
		case "PUT", "PATCH":
			action = "update"
		case "DELETE":
			action = "delete"
		default:
			action = "view"
		}

		// 构造权限码: resourceType:action
		permCode := resourceType + ":" + action

		// 检查权限
		if !pc.permService.HasPermission(user.UserID, permCode) {
			response.Forbidden(c, "权限不足: "+permCode)
			c.Abort()
			return
		}

		c.Next()
	}
}
