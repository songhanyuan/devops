package audit

import (
	"time"

	"devops/internal/middleware"
	"devops/internal/pkg/response"
	"devops/internal/repository"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	auditService *service.AuditService
}

func NewHandler(auditService *service.AuditService) *Handler {
	return &Handler{auditService: auditService}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	audit := r.Group("/audit-logs")
	audit.Use(middleware.RequireAdmin()) // 仅管理员可查看审计日志
	{
		audit.GET("", h.List)
		audit.GET("/stats", h.Stats)
		audit.GET("/export", h.Export)
		audit.GET("/:id", h.Get)
		audit.GET("/user/:userId", h.UserHistory)
		audit.GET("/resource/:module/:resourceId", h.ResourceHistory)
		audit.GET("/trace/:traceId", h.TraceHistory)
	}
}

// List 查询审计日志
func (h *Handler) List(c *gin.Context) {
	var params repository.AuditQueryParams

	// 基本参数
	params.Page = parseIntParam(c, "page", 1)
	params.PageSize = parseIntParam(c, "page_size", 20)
	params.Username = c.Query("username")
	params.Module = c.Query("module")
	params.Action = c.Query("action")
	params.ResourceID = c.Query("resource_id")
	params.Keyword = c.Query("keyword")
	params.TraceID = c.Query("trace_id")
	params.IP = c.Query("ip")

	// 用户ID
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			params.UserID = &userID
		}
	}

	// 状态
	if statusStr := c.Query("status"); statusStr != "" {
		status := parseIntParam(c, "status", -1)
		if status >= 0 {
			params.Status = &status
		}
	}

	// 时间范围
	if startStr := c.Query("start_time"); startStr != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", startStr); err == nil {
			params.StartTime = &t
		} else if t, err := time.Parse("2006-01-02", startStr); err == nil {
			params.StartTime = &t
		}
	}
	if endStr := c.Query("end_time"); endStr != "" {
		if t, err := time.Parse("2006-01-02 15:04:05", endStr); err == nil {
			params.EndTime = &t
		} else if t, err := time.Parse("2006-01-02", endStr); err == nil {
			t = t.Add(24*time.Hour - time.Second) // 当天结束
			params.EndTime = &t
		}
	}

	logs, total, err := h.auditService.Query(&params)
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}

	response.SuccessPage(c, logs, total, params.Page, params.PageSize)
}

// Get 获取日志详情
func (h *Handler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	log, err := h.auditService.GetByID(id)
	if err != nil {
		response.NotFound(c, "日志不存在")
		return
	}

	response.Success(c, log)
}

// Stats 获取统计数据
func (h *Handler) Stats(c *gin.Context) {
	// 默认统计最近7天
	endTime := time.Now()
	startTime := endTime.AddDate(0, 0, -7)

	if startStr := c.Query("start_time"); startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startTime = t
		}
	}
	if endStr := c.Query("end_time"); endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			endTime = t.Add(24*time.Hour - time.Second)
		}
	}

	stats, err := h.auditService.GetStats(startTime, endTime)
	if err != nil {
		response.Error(c, 500, "获取统计失败: "+err.Error())
		return
	}

	response.Success(c, stats)
}

// Export 导出日志
func (h *Handler) Export(c *gin.Context) {
	var params repository.AuditQueryParams
	params.Username = c.Query("username")
	params.Module = c.Query("module")
	params.Action = c.Query("action")

	if startStr := c.Query("start_time"); startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			params.StartTime = &t
		}
	}
	if endStr := c.Query("end_time"); endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			t = t.Add(24*time.Hour - time.Second)
			params.EndTime = &t
		}
	}

	data, filename, err := h.auditService.ExportCSV(&params)
	if err != nil {
		response.Error(c, 500, "导出失败: "+err.Error())
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(200, "text/csv; charset=utf-8", data)
}

// UserHistory 获取用户操作历史
func (h *Handler) UserHistory(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		response.BadRequest(c, "无效的用户ID")
		return
	}

	limit := parseIntParam(c, "limit", 50)
	logs, err := h.auditService.GetUserHistory(userID, limit)
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}

	response.Success(c, logs)
}

// ResourceHistory 获取资源变更历史
func (h *Handler) ResourceHistory(c *gin.Context) {
	module := c.Param("module")
	resourceID := c.Param("resourceId")

	limit := parseIntParam(c, "limit", 50)
	logs, err := h.auditService.GetResourceHistory(module, resourceID, limit)
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}

	response.Success(c, logs)
}

// TraceHistory 获取追踪链路
func (h *Handler) TraceHistory(c *gin.Context) {
	traceID := c.Param("traceId")
	if traceID == "" {
		response.BadRequest(c, "追踪ID不能为空")
		return
	}

	logs, err := h.auditService.GetByTraceID(traceID)
	if err != nil {
		response.Error(c, 500, "查询失败: "+err.Error())
		return
	}

	response.Success(c, logs)
}

func parseIntParam(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	var result int
	if _, err := c.GetQuery(key); err {
		return defaultVal
	}
	if n, err := parseInt(val); err == nil {
		result = n
	} else {
		result = defaultVal
	}
	return result
}

func parseInt(s string) (int, error) {
	var n int
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, nil
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}
