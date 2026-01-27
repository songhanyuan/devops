package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ClusterRepository struct {
	db *gorm.DB
}

func NewClusterRepository(db *gorm.DB) *ClusterRepository {
	return &ClusterRepository{db: db}
}

func (r *ClusterRepository) Create(cluster *model.Cluster) error {
	return r.db.Create(cluster).Error
}

func (r *ClusterRepository) GetByID(id uuid.UUID) (*model.Cluster, error) {
	var cluster model.Cluster
	err := r.db.First(&cluster, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &cluster, nil
}

func (r *ClusterRepository) GetByCode(code string) (*model.Cluster, error) {
	var cluster model.Cluster
	err := r.db.First(&cluster, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &cluster, nil
}

func (r *ClusterRepository) Update(cluster *model.Cluster) error {
	return r.db.Save(cluster).Error
}

func (r *ClusterRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Cluster{}, "id = ?", id).Error
}

func (r *ClusterRepository) List(page, pageSize int, envCode, keyword string) ([]model.Cluster, int64, error) {
	var clusters []model.Cluster
	var total int64

	query := r.db.Model(&model.Cluster{})

	if envCode != "" {
		query = query.Where("env_code = ?", envCode)
	}
	if keyword != "" {
		query = query.Where("name LIKE ? OR code LIKE ? OR api_server LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&clusters).Error; err != nil {
		return nil, 0, err
	}

	return clusters, total, nil
}

func (r *ClusterRepository) ListAll() ([]model.Cluster, error) {
	var clusters []model.Cluster
	err := r.db.Where("status != 0").Order("created_at DESC").Find(&clusters).Error
	return clusters, err
}

func (r *ClusterRepository) UpdateStatus(id uuid.UUID, status int, nodeCount, podCount int) error {
	return r.db.Model(&model.Cluster{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":       status,
			"node_count":   nodeCount,
			"pod_count":    podCount,
			"last_check_at": gorm.Expr("NOW()"),
		}).Error
}
