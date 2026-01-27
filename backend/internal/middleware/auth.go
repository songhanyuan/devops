package middleware

import (
	"strings"

	"devops/internal/pkg/jwt"
	"devops/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

const (
	AuthorizationHeader = "Authorization"
	BearerPrefix        = "Bearer "
	ContextUserKey      = "user"
)

func JWTAuth(jwtManager *jwt.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader(AuthorizationHeader)
		if authHeader == "" {
			response.Unauthorized(c, "missing authorization header")
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, BearerPrefix) {
			response.Unauthorized(c, "invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, BearerPrefix)
		claims, err := jwtManager.ParseToken(tokenString)
		if err != nil {
			response.Unauthorized(c, err.Error())
			c.Abort()
			return
		}

		c.Set(ContextUserKey, claims)
		c.Next()
	}
}

func GetCurrentUser(c *gin.Context) *jwt.Claims {
	if claims, exists := c.Get(ContextUserKey); exists {
		if user, ok := claims.(*jwt.Claims); ok {
			return user
		}
	}
	return nil
}
