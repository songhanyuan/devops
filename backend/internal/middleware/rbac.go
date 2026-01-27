package middleware

import (
	"devops/internal/pkg/response"

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
