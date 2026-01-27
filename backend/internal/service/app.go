package service

import (
	"errors"
	"time"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrAppNotFound  = errors.New("application not found")
	ErrAppCodeExists = errors.New("application code already exists")
)

type AppService struct {
	appRepo    *repository.AppRepository
	envRepo    *repository.EnvRepository
	deployRepo *repository.DeploymentRepository
	hostRepo   *repository.HostRepository
}

func NewAppService(
	appRepo *repository.AppRepository,
	envRepo *repository.EnvRepository,
	deployRepo *repository.DeploymentRepository,
	hostRepo *repository.HostRepository,
) *AppService {
	return &AppService{
		appRepo:    appRepo,
		envRepo:    envRepo,
		deployRepo: deployRepo,
		hostRepo:   hostRepo,
	}
}

type CreateAppRequest struct {
	Name        string      `json:"name" binding:"required"`
	Code        string      `json:"code" binding:"required"`
	Type        string      `json:"type" binding:"required"`
	Language    string      `json:"language"`
	RepoURL     string      `json:"repo_url"`
	Branch      string      `json:"branch"`
	DeployPath  string      `json:"deploy_path"`
	BuildCmd    string      `json:"build_cmd"`
	StartCmd    string      `json:"start_cmd"`
	StopCmd     string      `json:"stop_cmd"`
	HealthCheck string      `json:"health_check"`
	EnvID       *uuid.UUID  `json:"env_id"`
	HostIDs     []uuid.UUID `json:"host_ids"`
	Description string      `json:"description"`
}

func (s *AppService) Create(req *CreateAppRequest, createdBy uuid.UUID) (*model.Application, error) {
	// Check if code exists
	if _, err := s.appRepo.GetByCode(req.Code); err == nil {
		return nil, ErrAppCodeExists
	}

	branch := req.Branch
	if branch == "" {
		branch = "main"
	}

	app := &model.Application{
		Name:        req.Name,
		Code:        req.Code,
		Type:        req.Type,
		Language:    req.Language,
		RepoURL:     req.RepoURL,
		Branch:      branch,
		DeployPath:  req.DeployPath,
		BuildCmd:    req.BuildCmd,
		StartCmd:    req.StartCmd,
		StopCmd:     req.StopCmd,
		HealthCheck: req.HealthCheck,
		EnvID:       req.EnvID,
		Description: req.Description,
		Status:      1,
		CreatedBy:   createdBy,
	}

	if err := s.appRepo.Create(app); err != nil {
		return nil, err
	}

	// Update hosts
	if len(req.HostIDs) > 0 {
		if err := s.appRepo.UpdateHosts(app.ID, req.HostIDs); err != nil {
			return nil, err
		}
	}

	return s.appRepo.GetByID(app.ID)
}

type UpdateAppRequest struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"`
	Language    string      `json:"language"`
	RepoURL     string      `json:"repo_url"`
	Branch      string      `json:"branch"`
	DeployPath  string      `json:"deploy_path"`
	BuildCmd    string      `json:"build_cmd"`
	StartCmd    string      `json:"start_cmd"`
	StopCmd     string      `json:"stop_cmd"`
	HealthCheck string      `json:"health_check"`
	EnvID       *uuid.UUID  `json:"env_id"`
	HostIDs     []uuid.UUID `json:"host_ids"`
	Description string      `json:"description"`
	Status      *int        `json:"status"`
}

func (s *AppService) Update(id uuid.UUID, req *UpdateAppRequest) (*model.Application, error) {
	app, err := s.appRepo.GetByID(id)
	if err != nil {
		return nil, ErrAppNotFound
	}

	if req.Name != "" {
		app.Name = req.Name
	}
	if req.Type != "" {
		app.Type = req.Type
	}
	if req.Language != "" {
		app.Language = req.Language
	}
	if req.RepoURL != "" {
		app.RepoURL = req.RepoURL
	}
	if req.Branch != "" {
		app.Branch = req.Branch
	}
	if req.DeployPath != "" {
		app.DeployPath = req.DeployPath
	}
	if req.BuildCmd != "" {
		app.BuildCmd = req.BuildCmd
	}
	if req.StartCmd != "" {
		app.StartCmd = req.StartCmd
	}
	if req.StopCmd != "" {
		app.StopCmd = req.StopCmd
	}
	if req.HealthCheck != "" {
		app.HealthCheck = req.HealthCheck
	}
	if req.EnvID != nil {
		app.EnvID = req.EnvID
	}
	if req.Description != "" {
		app.Description = req.Description
	}
	if req.Status != nil {
		app.Status = *req.Status
	}

	if err := s.appRepo.Update(app); err != nil {
		return nil, err
	}

	if len(req.HostIDs) > 0 {
		if err := s.appRepo.UpdateHosts(id, req.HostIDs); err != nil {
			return nil, err
		}
	}

	return s.appRepo.GetByID(id)
}

func (s *AppService) Delete(id uuid.UUID) error {
	return s.appRepo.Delete(id)
}

func (s *AppService) GetByID(id uuid.UUID) (*model.Application, error) {
	return s.appRepo.GetByID(id)
}

func (s *AppService) List(page, pageSize int, envID *uuid.UUID, keyword string) ([]model.Application, int64, error) {
	return s.appRepo.List(page, pageSize, envID, keyword)
}

// Deployment
type DeploymentService struct {
	deployRepo *repository.DeploymentRepository
	appRepo    *repository.AppRepository
}

func NewDeploymentService(deployRepo *repository.DeploymentRepository, appRepo *repository.AppRepository) *DeploymentService {
	return &DeploymentService{
		deployRepo: deployRepo,
		appRepo:    appRepo,
	}
}

type CreateDeployRequest struct {
	AppID     uuid.UUID `json:"app_id" binding:"required"`
	Version   string    `json:"version"`
	CommitID  string    `json:"commit_id"`
	CommitMsg string    `json:"commit_msg"`
	Branch    string    `json:"branch"`
}

func (s *DeploymentService) Create(req *CreateDeployRequest, createdBy uuid.UUID) (*model.Deployment, error) {
	app, err := s.appRepo.GetByID(req.AppID)
	if err != nil {
		return nil, ErrAppNotFound
	}

	branch := req.Branch
	if branch == "" {
		branch = app.Branch
	}

	deploy := &model.Deployment{
		AppID:     req.AppID,
		Version:   req.Version,
		CommitID:  req.CommitID,
		CommitMsg: req.CommitMsg,
		Branch:    branch,
		Type:      "deploy",
		Status:    0, // pending
		CreatedBy: createdBy,
	}

	if err := s.deployRepo.Create(deploy); err != nil {
		return nil, err
	}

	return s.deployRepo.GetByID(deploy.ID)
}

func (s *DeploymentService) StartDeploy(id uuid.UUID) error {
	deploy, err := s.deployRepo.GetByID(id)
	if err != nil {
		return err
	}

	now := time.Now()
	deploy.Status = 1 // running
	deploy.StartTime = &now

	return s.deployRepo.Update(deploy)
}

func (s *DeploymentService) FinishDeploy(id uuid.UUID, success bool, output string) error {
	deploy, err := s.deployRepo.GetByID(id)
	if err != nil {
		return err
	}

	now := time.Now()
	deploy.EndTime = &now
	deploy.Output = output

	if success {
		deploy.Status = 2 // success
	} else {
		deploy.Status = 3 // failed
	}

	return s.deployRepo.Update(deploy)
}

func (s *DeploymentService) GetByID(id uuid.UUID) (*model.Deployment, error) {
	return s.deployRepo.GetByID(id)
}

func (s *DeploymentService) List(appID uuid.UUID, page, pageSize int) ([]model.Deployment, int64, error) {
	return s.deployRepo.List(appID, page, pageSize)
}

func (s *DeploymentService) Rollback(appID uuid.UUID, targetDeployID uuid.UUID, createdBy uuid.UUID) (*model.Deployment, error) {
	target, err := s.deployRepo.GetByID(targetDeployID)
	if err != nil {
		return nil, err
	}

	deploy := &model.Deployment{
		AppID:     appID,
		Version:   target.Version,
		CommitID:  target.CommitID,
		CommitMsg: "Rollback to " + target.Version,
		Branch:    target.Branch,
		Type:      "rollback",
		Status:    0,
		CreatedBy: createdBy,
	}

	if err := s.deployRepo.Create(deploy); err != nil {
		return nil, err
	}

	return s.deployRepo.GetByID(deploy.ID)
}

// Environment
type EnvService struct {
	envRepo *repository.EnvRepository
}

func NewEnvService(envRepo *repository.EnvRepository) *EnvService {
	return &EnvService{envRepo: envRepo}
}

func (s *EnvService) List() ([]model.Environment, error) {
	return s.envRepo.List()
}

func (s *EnvService) GetByID(id uuid.UUID) (*model.Environment, error) {
	return s.envRepo.GetByID(id)
}
