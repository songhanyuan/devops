package repository

import (
	"time"

	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

func (r *AuditRepository) Create(log *model.AuditLog) error {
	return r.db.Create(log).Error
}

func (r *AuditRepository) GetByID(id uuid.UUID) (*model.AuditLog, error) {
	var log model.AuditLog
	if err := r.db.First(&log, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &log, nil
}

// AuditQueryParams 审计日志查询参数
type AuditQueryParams struct {
	Page       int        `form:"page"`
	PageSize   int        `form:"page_size"`
	UserID     *uuid.UUID `form:"user_id"`
	Username   string     `form:"username"`
	Module     string     `form:"module"`
	Action     string     `form:"action"`
	ResourceID string     `form:"resource_id"`
	Status     *int       `form:"status"`
	StartTime  *time.Time `form:"start_time"`
	EndTime    *time.Time `form:"end_time"`
	Keyword    string     `form:"keyword"`
	TraceID    string     `form:"trace_id"`
	IP         string     `form:"ip"`
}

// Query 查询审计日志
func (r *AuditRepository) Query(params *AuditQueryParams) ([]model.AuditLog, int64, error) {
	var logs []model.AuditLog
	var total int64

	query := r.db.Model(&model.AuditLog{})

	if params.UserID != nil {
		query = query.Where("user_id = ?", params.UserID)
	}
	if params.Username != "" {
		query = query.Where("username LIKE ?", "%"+params.Username+"%")
	}
	if params.Module != "" {
		query = query.Where("module = ?", params.Module)
	}
	if params.Action != "" {
		query = query.Where("action = ?", params.Action)
	}
	if params.ResourceID != "" {
		query = query.Where("resource_id = ?", params.ResourceID)
	}
	if params.Status != nil {
		query = query.Where("status = ?", *params.Status)
	}
	if params.StartTime != nil {
		query = query.Where("created_at >= ?", params.StartTime)
	}
	if params.EndTime != nil {
		query = query.Where("created_at <= ?", params.EndTime)
	}
	if params.Keyword != "" {
		query = query.Where("resource_name LIKE ? OR detail LIKE ? OR new_value LIKE ?",
			"%"+params.Keyword+"%", "%"+params.Keyword+"%", "%"+params.Keyword+"%")
	}
	if params.TraceID != "" {
		query = query.Where("trace_id = ?", params.TraceID)
	}
	if params.IP != "" {
		query = query.Where("ip = ?", params.IP)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetByUserID 获取用户的操作历史
func (r *AuditRepository) GetByUserID(userID uuid.UUID, limit int) ([]model.AuditLog, error) {
	var logs []model.AuditLog
	if limit <= 0 {
		limit = 50
	}
	if err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// GetByResource 获取资源的变更历史
func (r *AuditRepository) GetByResource(module, resourceID string, limit int) ([]model.AuditLog, error) {
	var logs []model.AuditLog
	if limit <= 0 {
		limit = 50
	}
	if err := r.db.Where("module = ? AND resource_id = ?", module, resourceID).
		Order("created_at DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// GetByTraceID 根据追踪ID获取相关日志
func (r *AuditRepository) GetByTraceID(traceID string) ([]model.AuditLog, error) {
	var logs []model.AuditLog
	if err := r.db.Where("trace_id = ?", traceID).Order("created_at ASC").Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

// AuditStats 审计统计
type AuditStats struct {
	TotalCount   int64            `json:"total_count"`
	SuccessCount int64            `json:"success_count"`
	FailedCount  int64            `json:"failed_count"`
	ActionCounts map[string]int64 `json:"action_counts"`
	ModuleCounts map[string]int64 `json:"module_counts"`
	TopUsers     []UserStats      `json:"top_users"`
	HourlyTrend  []HourlyStats    `json:"hourly_trend"`
}

type UserStats struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Count    int64     `json:"count"`
}

type HourlyStats struct {
	Hour  string `json:"hour"`
	Count int64  `json:"count"`
}

// GetStats 获取统计数据
func (r *AuditRepository) GetStats(startTime, endTime time.Time) (*AuditStats, error) {
	stats := &AuditStats{
		ActionCounts: make(map[string]int64),
		ModuleCounts: make(map[string]int64),
	}

	query := r.db.Model(&model.AuditLog{}).Where("created_at BETWEEN ? AND ?", startTime, endTime)

	// 总数
	query.Count(&stats.TotalCount)

	// 成功/失败数
	r.db.Model(&model.AuditLog{}).Where("created_at BETWEEN ? AND ? AND status = 1", startTime, endTime).Count(&stats.SuccessCount)
	r.db.Model(&model.AuditLog{}).Where("created_at BETWEEN ? AND ? AND status = 0", startTime, endTime).Count(&stats.FailedCount)

	// 按操作类型统计
	var actionResults []struct {
		Action string
		Count  int64
	}
	r.db.Model(&model.AuditLog{}).
		Select("action, count(*) as count").
		Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Group("action").
		Scan(&actionResults)
	for _, ar := range actionResults {
		stats.ActionCounts[ar.Action] = ar.Count
	}

	// 按模块统计
	var moduleResults []struct {
		Module string
		Count  int64
	}
	r.db.Model(&model.AuditLog{}).
		Select("module, count(*) as count").
		Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Group("module").
		Scan(&moduleResults)
	for _, mr := range moduleResults {
		stats.ModuleCounts[mr.Module] = mr.Count
	}

	// 操作最多的用户
	r.db.Model(&model.AuditLog{}).
		Select("user_id, username, count(*) as count").
		Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Group("user_id, username").
		Order("count DESC").
		Limit(10).
		Scan(&stats.TopUsers)

	// 按小时统计趋势
	r.db.Model(&model.AuditLog{}).
		Select("to_char(created_at, 'YYYY-MM-DD HH24') as hour, count(*) as count").
		Where("created_at BETWEEN ? AND ?", startTime, endTime).
		Group("hour").
		Order("hour ASC").
		Scan(&stats.HourlyTrend)

	return stats, nil
}

// DeleteOldLogs 删除旧日志（超过指定天数）
func (r *AuditRepository) DeleteOldLogs(days int) (int64, error) {
	cutoff := time.Now().AddDate(0, 0, -days)
	result := r.db.Where("created_at < ?", cutoff).Delete(&model.AuditLog{})
	return result.RowsAffected, result.Error
}
