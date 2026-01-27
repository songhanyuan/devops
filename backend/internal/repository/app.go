package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AppRepository struct {
	db *gorm.DB
}

func NewAppRepository(db *gorm.DB) *AppRepository {
	return &AppRepository{db: db}
}

func (r *AppRepository) Create(app *model.Application) error {
	return r.db.Create(app).Error
}

func (r *AppRepository) GetByID(id uuid.UUID) (*model.Application, error) {
	var app model.Application
	err := r.db.Preload("Env").Preload("Hosts").First(&app, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *AppRepository) GetByCode(code string) (*model.Application, error) {
	var app model.Application
	err := r.db.Preload("Env").Preload("Hosts").First(&app, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *AppRepository) Update(app *model.Application) error {
	return r.db.Save(app).Error
}

func (r *AppRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Application{}, "id = ?", id).Error
}

func (r *AppRepository) List(page, pageSize int, envID *uuid.UUID, keyword string) ([]model.Application, int64, error) {
	var apps []model.Application
	var total int64

	query := r.db.Model(&model.Application{}).Preload("Env")

	if envID != nil {
		query = query.Where("env_id = ?", *envID)
	}
	if keyword != "" {
		query = query.Where("name LIKE ? OR code LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&apps).Error; err != nil {
		return nil, 0, err
	}

	return apps, total, nil
}

func (r *AppRepository) UpdateHosts(appID uuid.UUID, hostIDs []uuid.UUID) error {
	app, err := r.GetByID(appID)
	if err != nil {
		return err
	}

	var hosts []model.Host
	if len(hostIDs) > 0 {
		if err := r.db.Find(&hosts, "id IN ?", hostIDs).Error; err != nil {
			return err
		}
	}

	return r.db.Model(app).Association("Hosts").Replace(hosts)
}

// Environment
type EnvRepository struct {
	db *gorm.DB
}

func NewEnvRepository(db *gorm.DB) *EnvRepository {
	return &EnvRepository{db: db}
}

func (r *EnvRepository) Create(env *model.Environment) error {
	return r.db.Create(env).Error
}

func (r *EnvRepository) GetByID(id uuid.UUID) (*model.Environment, error) {
	var env model.Environment
	err := r.db.First(&env, "id = ?", id).Error
	return &env, err
}

func (r *EnvRepository) GetByCode(code string) (*model.Environment, error) {
	var env model.Environment
	err := r.db.First(&env, "code = ?", code).Error
	return &env, err
}

func (r *EnvRepository) List() ([]model.Environment, error) {
	var envs []model.Environment
	err := r.db.Order("sort ASC").Find(&envs).Error
	return envs, err
}

func (r *EnvRepository) InitDefaultEnvs() error {
	envs := []model.Environment{
		{Name: "开发环境", Code: "dev", Color: "#52c41a", Sort: 1},
		{Name: "测试环境", Code: "test", Color: "#faad14", Sort: 2},
		{Name: "预发环境", Code: "staging", Color: "#1890ff", Sort: 3},
		{Name: "生产环境", Code: "prod", Color: "#f5222d", Sort: 4},
	}

	for _, env := range envs {
		var existing model.Environment
		if err := r.db.First(&existing, "code = ?", env.Code).Error; err == gorm.ErrRecordNotFound {
			if err := r.db.Create(&env).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

// Deployment
type DeploymentRepository struct {
	db *gorm.DB
}

func NewDeploymentRepository(db *gorm.DB) *DeploymentRepository {
	return &DeploymentRepository{db: db}
}

func (r *DeploymentRepository) Create(deploy *model.Deployment) error {
	return r.db.Create(deploy).Error
}

func (r *DeploymentRepository) GetByID(id uuid.UUID) (*model.Deployment, error) {
	var deploy model.Deployment
	err := r.db.Preload("App").First(&deploy, "id = ?", id).Error
	return &deploy, err
}

func (r *DeploymentRepository) Update(deploy *model.Deployment) error {
	return r.db.Save(deploy).Error
}

func (r *DeploymentRepository) List(appID uuid.UUID, page, pageSize int) ([]model.Deployment, int64, error) {
	var deploys []model.Deployment
	var total int64

	query := r.db.Model(&model.Deployment{}).Where("app_id = ?", appID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&deploys).Error; err != nil {
		return nil, 0, err
	}

	return deploys, total, nil
}

func (r *DeploymentRepository) GetLatestByAppID(appID uuid.UUID) (*model.Deployment, error) {
	var deploy model.Deployment
	err := r.db.Where("app_id = ? AND status = 2", appID).Order("created_at DESC").First(&deploy).Error
	return &deploy, err
}
