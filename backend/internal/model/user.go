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
	Groups    []UserGroup    `json:"groups,omitempty" gorm:"many2many:user_group_members;"`
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
	Type      string         `json:"type" gorm:"size:20;not null"`    // menu, button, api
	Resource  string         `json:"resource" gorm:"size:50;index"`   // 资源类型: user, host, app, config, cluster
	Action    string         `json:"action" gorm:"size:50"`           // 操作类型: view, create, update, delete, execute
	ParentID  *uuid.UUID     `json:"parent_id" gorm:"type:uuid"`
	Path      string         `json:"path" gorm:"size:255"`
	Method    string         `json:"method" gorm:"size:50"`           // GET, POST, PUT, DELETE 或多个用逗号分隔
	Icon      string         `json:"icon" gorm:"size:50"`
	Sort      int            `json:"sort" gorm:"default:0"`
	Status    int            `json:"status" gorm:"default:1"`         // 1: enabled, 0: disabled
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

// UserGroup 用户分组
type UserGroup struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"uniqueIndex;size:50;not null"`
	Description string         `json:"description" gorm:"size:255"`
	ParentID    *uuid.UUID     `json:"parent_id" gorm:"type:uuid;index"` // 支持层级分组
	Users       []User         `json:"users,omitempty" gorm:"many2many:user_group_members;"`
	Roles       []Role         `json:"roles,omitempty" gorm:"many2many:user_group_roles;"`
	CreatedBy   uuid.UUID      `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (g *UserGroup) BeforeCreate(tx *gorm.DB) error {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return nil
}

// ResourcePermission 资源级权限控制
type ResourcePermission struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primary_key"`
	RoleID       uuid.UUID  `json:"role_id" gorm:"type:uuid;index;not null"`
	ResourceType string     `json:"resource_type" gorm:"size:50;not null;index"` // host, app, config, cluster 等
	ResourceID   *uuid.UUID `json:"resource_id" gorm:"type:uuid;index"`          // nil 表示该类型的所有资源
	Actions      string     `json:"actions" gorm:"size:255;not null"`            // JSON数组: ["view","create","update","delete"]
	Conditions   string     `json:"conditions" gorm:"type:text"`                 // JSON条件: {"env":["dev","test"]}
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (rp *ResourcePermission) BeforeCreate(tx *gorm.DB) error {
	if rp.ID == uuid.Nil {
		rp.ID = uuid.New()
	}
	return nil
}

// AuditLog 审计日志
type AuditLog struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	UserID       uuid.UUID `json:"user_id" gorm:"type:uuid;index"`
	Username     string    `json:"username" gorm:"size:50;index"`
	Action       string    `json:"action" gorm:"size:50;not null;index"`    // create, update, delete, view, login, logout
	Module       string    `json:"module" gorm:"size:50;index"`             // user, host, app, config, cluster, deploy
	Resource     string    `json:"resource" gorm:"size:100"`                // API路径
	ResourceID   string    `json:"resource_id" gorm:"size:50;index"`
	ResourceName string    `json:"resource_name" gorm:"size:100"`           // 资源名称（可读）
	OldValue     string    `json:"old_value" gorm:"type:text"`              // 修改前的值
	NewValue     string    `json:"new_value" gorm:"type:text"`              // 修改后的值（原Detail字段）
	Detail       string    `json:"detail" gorm:"type:text"`                 // 保留兼容
	IP           string    `json:"ip" gorm:"size:50;index"`
	UserAgent    string    `json:"user_agent" gorm:"size:255"`
	Status       int       `json:"status" gorm:"index"`                     // 1: success, 0: failed
	ErrorMessage string    `json:"error_message" gorm:"size:500"`           // 错误信息
	Duration     int64     `json:"duration"`                                // 请求耗时(毫秒)
	TraceID      string    `json:"trace_id" gorm:"size:50;index"`           // 追踪ID
	CreatedAt    time.Time `json:"created_at" gorm:"index"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
