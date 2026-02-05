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

type K8sYAMLHistoryRepository struct {
	db *gorm.DB
}

func NewK8sYAMLHistoryRepository(db *gorm.DB) *K8sYAMLHistoryRepository {
	return &K8sYAMLHistoryRepository{db: db}
}

func (r *K8sYAMLHistoryRepository) Create(history *model.K8sYAMLHistory) error {
	return r.db.Create(history).Error
}

func (r *K8sYAMLHistoryRepository) ListByResource(clusterID uuid.UUID, kind, namespace, name string, limit int) ([]model.K8sYAMLHistory, error) {
	var histories []model.K8sYAMLHistory
	query := r.db.Where("cluster_id = ? AND kind = ? AND name = ?", clusterID, kind, name)
	if namespace != "" {
		query = query.Where("namespace = ?", namespace)
	} else {
		query = query.Where("namespace = '' OR namespace IS NULL")
	}
	if limit <= 0 {
		limit = 20
	}
	err := query.Order("created_at DESC").Limit(limit).Find(&histories).Error
	return histories, err
}

func (r *K8sYAMLHistoryRepository) TrimHistory(clusterID uuid.UUID, kind, namespace, name string, keep int) error {
	if keep <= 0 {
		return nil
	}

	var ids []uuid.UUID
	query := r.db.Model(&model.K8sYAMLHistory{}).
		Where("cluster_id = ? AND kind = ? AND name = ?", clusterID, kind, name)
	if namespace != "" {
		query = query.Where("namespace = ?", namespace)
	} else {
		query = query.Where("namespace = '' OR namespace IS NULL")
	}
	if err := query.Order("created_at DESC").Offset(keep).Pluck("id", &ids).Error; err != nil {
		return err
	}
	if len(ids) == 0 {
		return nil
	}
	return r.db.Delete(&model.K8sYAMLHistory{}, "id IN ?", ids).Error
}
