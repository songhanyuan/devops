package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ConfigRepository struct {
	db *gorm.DB
}

func NewConfigRepository(db *gorm.DB) *ConfigRepository {
	return &ConfigRepository{db: db}
}

func (r *ConfigRepository) Create(config *model.ConfigItem) error {
	return r.db.Create(config).Error
}

func (r *ConfigRepository) GetByID(id uuid.UUID) (*model.ConfigItem, error) {
	var config model.ConfigItem
	err := r.db.First(&config, "id = ?", id).Error
	return &config, err
}

func (r *ConfigRepository) GetByKey(key, envCode, appCode string) (*model.ConfigItem, error) {
	var config model.ConfigItem
	query := r.db.Where("key = ? AND env_code = ?", key, envCode)
	if appCode != "" {
		query = query.Where("app_code = ?", appCode)
	} else {
		query = query.Where("app_code = '' OR app_code IS NULL")
	}
	err := query.First(&config).Error
	return &config, err
}

func (r *ConfigRepository) Update(config *model.ConfigItem) error {
	return r.db.Save(config).Error
}

func (r *ConfigRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ConfigItem{}, "id = ?", id).Error
}

func (r *ConfigRepository) List(page, pageSize int, envCode, appCode, keyword string) ([]model.ConfigItem, int64, error) {
	var configs []model.ConfigItem
	var total int64

	query := r.db.Model(&model.ConfigItem{})

	if envCode != "" {
		query = query.Where("env_code = ?", envCode)
	}
	if appCode != "" {
		query = query.Where("app_code = ?", appCode)
	}
	if keyword != "" {
		query = query.Where("key LIKE ? OR description LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("key ASC").Find(&configs).Error; err != nil {
		return nil, 0, err
	}

	return configs, total, nil
}

func (r *ConfigRepository) GetByEnvAndApp(envCode, appCode string) ([]model.ConfigItem, error) {
	var configs []model.ConfigItem
	query := r.db.Where("env_code = ?", envCode)
	if appCode != "" {
		query = query.Where("app_code = ? OR app_code = '' OR app_code IS NULL", appCode)
	}
	err := query.Order("key ASC").Find(&configs).Error
	return configs, err
}

// Config History
type ConfigHistoryRepository struct {
	db *gorm.DB
}

func NewConfigHistoryRepository(db *gorm.DB) *ConfigHistoryRepository {
	return &ConfigHistoryRepository{db: db}
}

func (r *ConfigHistoryRepository) Create(history *model.ConfigHistory) error {
	return r.db.Create(history).Error
}

func (r *ConfigHistoryRepository) ListByConfigID(configID uuid.UUID, limit int) ([]model.ConfigHistory, error) {
	var histories []model.ConfigHistory
	err := r.db.Where("config_id = ?", configID).Order("created_at DESC").Limit(limit).Find(&histories).Error
	return histories, err
}
