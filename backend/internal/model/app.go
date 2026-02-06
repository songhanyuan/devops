package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Application struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"size:100;not null;index"`
	Code        string         `json:"code" gorm:"uniqueIndex;size:50;not null"`
	Type        string         `json:"type" gorm:"size:20;not null"` // web, api, service, job
	Language    string         `json:"language" gorm:"size:20"`       // go, java, python, nodejs
	RepoURL     string         `json:"repo_url" gorm:"size:255"`
	Branch      string         `json:"branch" gorm:"size:50;default:'main'"`
	DeployPath  string         `json:"deploy_path" gorm:"size:255"`
	BuildCmd    string         `json:"build_cmd" gorm:"size:500"`
	StartCmd    string         `json:"start_cmd" gorm:"size:500"`
	StopCmd     string         `json:"stop_cmd" gorm:"size:500"`
	HealthCheck string         `json:"health_check" gorm:"size:255"` // health check URL
	EnvID       *uuid.UUID     `json:"env_id" gorm:"type:uuid;index"`
	Env         *Environment   `json:"env,omitempty" gorm:"foreignKey:EnvID"`
	Hosts       []Host         `json:"hosts,omitempty" gorm:"many2many:app_hosts;"`
	Status      int            `json:"status" gorm:"default:1;index"` // 1: enabled, 0: disabled
	Description string         `json:"description" gorm:"size:255"`
	CreatedBy   uuid.UUID      `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (a *Application) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type Environment struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"size:50;not null"`
	Code        string         `json:"code" gorm:"uniqueIndex;size:20;not null"` // dev, test, staging, prod
	Color       string         `json:"color" gorm:"size:20;default:'#1890ff'"`
	Description string         `json:"description" gorm:"size:255"`
	Sort        int            `json:"sort" gorm:"default:0"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (e *Environment) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

type Deployment struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	AppID       uuid.UUID      `json:"app_id" gorm:"type:uuid;index;not null"`
	App         *Application   `json:"app,omitempty" gorm:"foreignKey:AppID"`
	Version     string         `json:"version" gorm:"size:50"`
	CommitID    string         `json:"commit_id" gorm:"size:50"`
	CommitMsg   string         `json:"commit_msg" gorm:"size:255"`
	Branch      string         `json:"branch" gorm:"size:50"`
	Type        string         `json:"type" gorm:"size:20;default:'deploy'"` // deploy, rollback
	Status      int            `json:"status" gorm:"default:0"`              // 0: pending, 1: running, 2: success, 3: failed
	Output      string         `json:"output" gorm:"type:text"`
	HostResults string         `json:"host_results" gorm:"type:text"` // JSON array of per-host results
	StartTime   *time.Time     `json:"start_time"`
	EndTime     *time.Time     `json:"end_time"`
	CreatedBy   uuid.UUID      `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time      `json:"created_at" gorm:"index"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

func (d *Deployment) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

type DeployScript struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	AppID     uuid.UUID      `json:"app_id" gorm:"type:uuid;index"`
	Name      string         `json:"name" gorm:"size:100;not null"`
	Type      string         `json:"type" gorm:"size:20;not null"` // before_deploy, deploy, after_deploy
	Content   string         `json:"content" gorm:"type:text;not null"`
	Sort      int            `json:"sort" gorm:"default:0"`
	Enabled   bool           `json:"enabled" gorm:"default:true"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (s *DeployScript) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
