package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Username  string         `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Password  string         `json:"-" gorm:"size:255;not null"`
	Email     string         `json:"email" gorm:"uniqueIndex;size:100"`
	Phone     string         `json:"phone" gorm:"size:20"`
	RealName  string         `json:"real_name" gorm:"size:50"`
	Avatar    string         `json:"avatar" gorm:"size:255"`
	Status    int            `json:"status" gorm:"default:1"` // 1: active, 0: disabled
	RoleID    uuid.UUID      `json:"role_id" gorm:"type:uuid"`
	Role      *Role          `json:"role,omitempty" gorm:"foreignKey:RoleID"`
	LastLogin *time.Time     `json:"last_login"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type Role struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"uniqueIndex;size:50;not null"`
	Code        string         `json:"code" gorm:"uniqueIndex;size:50;not null"`
	Description string         `json:"description" gorm:"size:255"`
	Permissions []Permission   `json:"permissions,omitempty" gorm:"many2many:role_permissions;"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

type Permission struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name      string         `json:"name" gorm:"size:50;not null"`
	Code      string         `json:"code" gorm:"uniqueIndex;size:100;not null"`
	Type      string         `json:"type" gorm:"size:20;not null"` // menu, button, api
	ParentID  *uuid.UUID     `json:"parent_id" gorm:"type:uuid"`
	Path      string         `json:"path" gorm:"size:255"`
	Method    string         `json:"method" gorm:"size:10"`
	Icon      string         `json:"icon" gorm:"size:50"`
	Sort      int            `json:"sort" gorm:"default:0"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (p *Permission) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

type AuditLog struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;index"`
	Username  string    `json:"username" gorm:"size:50"`
	Action    string    `json:"action" gorm:"size:50;not null"`
	Resource  string    `json:"resource" gorm:"size:100"`
	ResourceID string   `json:"resource_id" gorm:"size:50"`
	Detail    string    `json:"detail" gorm:"type:text"`
	IP        string    `json:"ip" gorm:"size:50"`
	UserAgent string    `json:"user_agent" gorm:"size:255"`
	Status    int       `json:"status"` // 1: success, 0: failed
	CreatedAt time.Time `json:"created_at" gorm:"index"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
