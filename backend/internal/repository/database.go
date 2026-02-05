package repository

import (
	"fmt"

	"devops/internal/config"
	"devops/internal/model"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDatabase(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.Permission{},
		&model.UserGroup{},
		&model.ResourcePermission{},
		&model.AuditLog{},
		&model.Host{},
		&model.HostGroup{},
		&model.HostTag{},
		&model.AlertRule{},
		&model.AlertHistory{},
		&model.Application{},
		&model.Environment{},
		&model.Deployment{},
		&model.DeployScript{},
		&model.ConfigItem{},
		&model.ConfigHistory{},
		&model.Cluster{},
		&model.K8sYAMLHistory{},
	); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return db, nil
}
