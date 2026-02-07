package middleware

import (
	"bytes"
	"io"
	"time"

	"devops/internal/model"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func AuditLog(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip GET requests
		if c.Request.Method == "GET" {
			c.Next()
			return
		}

		// Read request body
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Capture response
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		startTime := time.Now()
		c.Next()

		// Get user info
		user := GetCurrentUser(c)
		var userID uuid.UUID
		var username string
		if user != nil {
			userID = user.UserID
			username = user.Username
		}

		// Determine action from method and path
		action := getAction(c.Request.Method, c.FullPath())

		// Determine status
		status := 1
		if c.Writer.Status() >= 400 {
			status = 0
		}

		// Create audit log
		auditLog := &model.AuditLog{
			UserID:     userID,
			Username:   username,
			Action:     action,
			Resource:   c.FullPath(),
			ResourceID: c.Param("id"),
			Detail:     string(requestBody),
			IP:         c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
			Status:     status,
			CreatedAt:  startTime,
		}

		// Async save to database
		go func(log *model.AuditLog) {
			defer func() {
				if r := recover(); r != nil {
					// Prevent goroutine panic from crashing the process
				}
			}()
			db.Create(log)
		}(auditLog)
	}
}

func getAction(method, path string) string {
	switch method {
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return method
	}
}
