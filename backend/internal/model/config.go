package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ConfigItem struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Key         string         `json:"key" gorm:"size:100;not null;index"`
	Value       string         `json:"value" gorm:"type:text"`
	ValueType   string         `json:"value_type" gorm:"size:20;default:'string'"` // string, number, boolean, json
	EnvCode     string         `json:"env_code" gorm:"size:20;not null;index"`     // dev, test, staging, prod
	AppCode     string         `json:"app_code" gorm:"size:50;index"`              // empty for global config
	IsSecret    bool           `json:"is_secret" gorm:"default:false"`
	Description string         `json:"description" gorm:"size:255"`
	Version     int            `json:"version" gorm:"default:1"`
	CreatedBy   uuid.UUID      `json:"created_by" gorm:"type:uuid"`
	UpdatedBy   uuid.UUID      `json:"updated_by" gorm:"type:uuid"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (c *ConfigItem) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

type ConfigHistory struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	ConfigID  uuid.UUID `json:"config_id" gorm:"type:uuid;index"`
	Key       string    `json:"key" gorm:"size:100"`
	OldValue  string    `json:"old_value" gorm:"type:text"`
	NewValue  string    `json:"new_value" gorm:"type:text"`
	EnvCode   string    `json:"env_code" gorm:"size:20"`
	AppCode   string    `json:"app_code" gorm:"size:50"`
	Version   int       `json:"version"`
	Action    string    `json:"action" gorm:"size:20"` // create, update, delete
	CreatedBy uuid.UUID `json:"created_by" gorm:"type:uuid"`
	Username  string    `json:"username" gorm:"size:50"`
	CreatedAt time.Time `json:"created_at" gorm:"index"`
}

func (h *ConfigHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}
