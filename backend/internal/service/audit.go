package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"time"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
)

type AuditService struct {
	auditRepo *repository.AuditRepository
}

func NewAuditService(auditRepo *repository.AuditRepository) *AuditService {
	return &AuditService{auditRepo: auditRepo}
}

// Query 查询审计日志
func (s *AuditService) Query(params *repository.AuditQueryParams) ([]model.AuditLog, int64, error) {
	return s.auditRepo.Query(params)
}

// GetByID 获取日志详情
func (s *AuditService) GetByID(id uuid.UUID) (*model.AuditLog, error) {
	return s.auditRepo.GetByID(id)
}

// GetUserHistory 获取用户操作历史
func (s *AuditService) GetUserHistory(userID uuid.UUID, limit int) ([]model.AuditLog, error) {
	return s.auditRepo.GetByUserID(userID, limit)
}

// GetResourceHistory 获取资源变更历史
func (s *AuditService) GetResourceHistory(module, resourceID string, limit int) ([]model.AuditLog, error) {
	return s.auditRepo.GetByResource(module, resourceID, limit)
}

// GetByTraceID 根据追踪ID获取关联日志
func (s *AuditService) GetByTraceID(traceID string) ([]model.AuditLog, error) {
	return s.auditRepo.GetByTraceID(traceID)
}

// GetStats 获取统计数据
func (s *AuditService) GetStats(startTime, endTime time.Time) (*repository.AuditStats, error) {
	return s.auditRepo.GetStats(startTime, endTime)
}

// ExportCSV 导出为 CSV
func (s *AuditService) ExportCSV(params *repository.AuditQueryParams) ([]byte, string, error) {
	// 设置较大的分页以导出更多数据
	params.PageSize = 10000
	logs, _, err := s.auditRepo.Query(params)
	if err != nil {
		return nil, "", err
	}

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// 写入表头
	header := []string{
		"ID", "时间", "用户名", "模块", "操作", "资源ID", "资源名称",
		"IP", "状态", "耗时(ms)", "追踪ID", "详情",
	}
	writer.Write(header)

	// 写入数据
	for _, log := range logs {
		status := "成功"
		if log.Status == 0 {
			status = "失败"
		}
		row := []string{
			log.ID.String(),
			log.CreatedAt.Format("2006-01-02 15:04:05"),
			log.Username,
			log.Module,
			log.Action,
			log.ResourceID,
			log.ResourceName,
			log.IP,
			status,
			formatDuration(log.Duration),
			log.TraceID,
			truncateString(log.NewValue, 500),
		}
		writer.Write(row)
	}

	writer.Flush()

	filename := "audit_logs_" + time.Now().Format("20060102150405") + ".csv"
	return buf.Bytes(), filename, nil
}

// CleanOldLogs 清理旧日志
func (s *AuditService) CleanOldLogs(days int) (int64, error) {
	if days < 30 {
		days = 30 // 最少保留30天
	}
	return s.auditRepo.DeleteOldLogs(days)
}

func formatDuration(ms int64) string {
	if ms == 0 {
		return "-"
	}
	return fmt.Sprintf("%dms", ms)
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
