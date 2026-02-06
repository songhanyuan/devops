package repository

import (
	"devops/internal/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HostRepository struct {
	db *gorm.DB
}

func NewHostRepository(db *gorm.DB) *HostRepository {
	return &HostRepository{db: db}
}

func (r *HostRepository) Create(host *model.Host) error {
	return r.db.Create(host).Error
}

func (r *HostRepository) GetByID(id uuid.UUID) (*model.Host, error) {
	var host model.Host
	err := r.db.Preload("Group").Preload("Tags").First(&host, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &host, nil
}

func (r *HostRepository) GetByIP(ip string) (*model.Host, error) {
	var host model.Host
	err := r.db.First(&host, "ip = ?", ip).Error
	if err != nil {
		return nil, err
	}
	return &host, nil
}

func (r *HostRepository) Update(host *model.Host) error {
	return r.db.Save(host).Error
}

func (r *HostRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Host{}, "id = ?", id).Error
}

func (r *HostRepository) List(page, pageSize int, groupID *uuid.UUID, keyword string, status *int) ([]model.Host, int64, error) {
	var hosts []model.Host
	var total int64

	query := r.db.Model(&model.Host{}).Preload("Group").Preload("Tags")

	if groupID != nil {
		query = query.Where("group_id = ?", *groupID)
	}
	if keyword != "" {
		kw := LikeWrap(keyword)
		query = query.Where("name LIKE ? OR ip LIKE ? OR hostname LIKE ?", kw, kw, kw)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&hosts).Error; err != nil {
		return nil, 0, err
	}

	return hosts, total, nil
}

func (r *HostRepository) UpdateStatus(id uuid.UUID, status int) error {
	return r.db.Model(&model.Host{}).Where("id = ?", id).Update("status", status).Error
}

func (r *HostRepository) GetAllByIDs(ids []uuid.UUID) ([]model.Host, error) {
	var hosts []model.Host
	err := r.db.Find(&hosts, "id IN ?", ids).Error
	return hosts, err
}

// Host Group
type HostGroupRepository struct {
	db *gorm.DB
}

func NewHostGroupRepository(db *gorm.DB) *HostGroupRepository {
	return &HostGroupRepository{db: db}
}

func (r *HostGroupRepository) Create(group *model.HostGroup) error {
	return r.db.Create(group).Error
}

func (r *HostGroupRepository) GetByID(id uuid.UUID) (*model.HostGroup, error) {
	var group model.HostGroup
	err := r.db.First(&group, "id = ?", id).Error
	return &group, err
}

func (r *HostGroupRepository) Update(group *model.HostGroup) error {
	return r.db.Save(group).Error
}

func (r *HostGroupRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.HostGroup{}, "id = ?", id).Error
}

func (r *HostGroupRepository) List() ([]model.HostGroup, error) {
	var groups []model.HostGroup
	err := r.db.Order("created_at ASC").Find(&groups).Error
	return groups, err
}

// Host Tag
type HostTagRepository struct {
	db *gorm.DB
}

func NewHostTagRepository(db *gorm.DB) *HostTagRepository {
	return &HostTagRepository{db: db}
}

func (r *HostTagRepository) Create(tag *model.HostTag) error {
	return r.db.Create(tag).Error
}

func (r *HostTagRepository) GetByID(id uuid.UUID) (*model.HostTag, error) {
	var tag model.HostTag
	err := r.db.First(&tag, "id = ?", id).Error
	return &tag, err
}

func (r *HostTagRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.HostTag{}, "id = ?", id).Error
}

func (r *HostTagRepository) List() ([]model.HostTag, error) {
	var tags []model.HostTag
	err := r.db.Order("name ASC").Find(&tags).Error
	return tags, err
}
