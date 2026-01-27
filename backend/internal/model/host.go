package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Host struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	Hostname    string         `json:"hostname" gorm:"size:100"`
	IP          string         `json:"ip" gorm:"size:50;not null;index"`
	Port        int            `json:"port" gorm:"default:22"`
	Username    string         `json:"username" gorm:"size:50"`
	AuthType    string         `json:"auth_type" gorm:"size:20;default:'password'"` // password, key
	Password    string         `json:"-" gorm:"size:255"`
	PrivateKey  string         `json:"-" gorm:"type:text"`
	OS          string         `json:"os" gorm:"size:50"`
	Arch        string         `json:"arch" gorm:"size:20"`
	Status      int            `json:"status" gorm:"default:1"` // 1: online, 0: offline, 2: unknown
	GroupID     *uuid.UUID     `json:"group_id" gorm:"type:uuid"`
	Group       *HostGroup     `json:"group,omitempty" gorm:"foreignKey:GroupID"`
	Tags        []HostTag      `json:"tags,omitempty" gorm:"many2many:host_tag_relations;"`
	Description string         `json:"description" gorm:"size:255"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (h *Host) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}

type HostGroup struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	ParentID    *uuid.UUID     `json:"parent_id" gorm:"type:uuid"`
	Description string         `json:"description" gorm:"size:255"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (g *HostGroup) BeforeCreate(tx *gorm.DB) error {
	if g.ID == uuid.Nil {
		g.ID = uuid.New()
	}
	return nil
}

type HostTag struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name      string         `json:"name" gorm:"uniqueIndex;size:50;not null"`
	Color     string         `json:"color" gorm:"size:20;default:'#1890ff'"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (t *HostTag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

type AlertRule struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	Metric      string         `json:"metric" gorm:"size:50;not null"` // cpu, memory, disk, network
	Operator    string         `json:"operator" gorm:"size:10;not null"` // >, <, >=, <=, ==
	Threshold   float64        `json:"threshold" gorm:"not null"`
	Duration    int            `json:"duration" gorm:"default:60"` // seconds
	Severity    string         `json:"severity" gorm:"size:20;default:'warning'"` // info, warning, critical
	Enabled     bool           `json:"enabled" gorm:"default:true"`
	HostIDs     string         `json:"host_ids" gorm:"type:text"` // JSON array of host IDs
	Channels    string         `json:"channels" gorm:"type:text"` // JSON array of notification channels
	Description string         `json:"description" gorm:"size:255"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (a *AlertRule) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type AlertHistory struct {
	ID         uuid.UUID  `json:"id" gorm:"type:uuid;primary_key"`
	RuleID     uuid.UUID  `json:"rule_id" gorm:"type:uuid;index"`
	RuleName   string     `json:"rule_name" gorm:"size:100"`
	HostID     uuid.UUID  `json:"host_id" gorm:"type:uuid;index"`
	HostName   string     `json:"host_name" gorm:"size:100"`
	HostIP     string     `json:"host_ip" gorm:"size:50"`
	Metric     string     `json:"metric" gorm:"size:50"`
	Value      float64    `json:"value"`
	Threshold  float64    `json:"threshold"`
	Severity   string     `json:"severity" gorm:"size:20"`
	Status     int        `json:"status" gorm:"default:0"` // 0: firing, 1: resolved
	ResolvedAt *time.Time `json:"resolved_at"`
	CreatedAt  time.Time  `json:"created_at" gorm:"index"`
}

func (a *AlertHistory) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
