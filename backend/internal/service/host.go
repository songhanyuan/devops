package service

import (
	"errors"
	"log"
	"strconv"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
	"golang.org/x/crypto/ssh"
)

var (
	ErrHostNotFound = errors.New("host not found")
	ErrHostIPExists = errors.New("host IP already exists")
)

type HostService struct {
	hostRepo      *repository.HostRepository
	hostGroupRepo *repository.HostGroupRepository
	hostTagRepo   *repository.HostTagRepository
}

func NewHostService(
	hostRepo *repository.HostRepository,
	hostGroupRepo *repository.HostGroupRepository,
	hostTagRepo *repository.HostTagRepository,
) *HostService {
	return &HostService{
		hostRepo:      hostRepo,
		hostGroupRepo: hostGroupRepo,
		hostTagRepo:   hostTagRepo,
	}
}

type CreateHostRequest struct {
	Name        string     `json:"name" binding:"required"`
	Hostname    string     `json:"hostname"`
	IP          string     `json:"ip" binding:"required"`
	Port        int        `json:"port"`
	Username    string     `json:"username"`
	AuthType    string     `json:"auth_type"`
	Password    string     `json:"password"`
	PrivateKey  string     `json:"private_key"`
	OS          string     `json:"os"`
	Arch        string     `json:"arch"`
	GroupID     *uuid.UUID `json:"group_id"`
	TagIDs      []uuid.UUID `json:"tag_ids"`
	Description string     `json:"description"`
}

func (s *HostService) Create(req *CreateHostRequest) (*model.Host, error) {
	// Check if IP exists
	if _, err := s.hostRepo.GetByIP(req.IP); err == nil {
		return nil, ErrHostIPExists
	}

	port := req.Port
	if port == 0 {
		port = 22
	}

	authType := req.AuthType
	if authType == "" {
		authType = "password"
	}

	host := &model.Host{
		Name:        req.Name,
		Hostname:    req.Hostname,
		IP:          req.IP,
		Port:        port,
		Username:    req.Username,
		AuthType:    authType,
		Password:    req.Password,
		PrivateKey:  req.PrivateKey,
		OS:          req.OS,
		Arch:        req.Arch,
		GroupID:     req.GroupID,
		Description: req.Description,
		Status:      2, // unknown
	}

	if err := s.hostRepo.Create(host); err != nil {
		return nil, err
	}

	return s.hostRepo.GetByID(host.ID)
}

type UpdateHostRequest struct {
	Name        string     `json:"name"`
	Hostname    string     `json:"hostname"`
	Port        int        `json:"port"`
	Username    string     `json:"username"`
	AuthType    string     `json:"auth_type"`
	Password    string     `json:"password"`
	PrivateKey  string     `json:"private_key"`
	OS          string     `json:"os"`
	Arch        string     `json:"arch"`
	GroupID     *uuid.UUID `json:"group_id"`
	Description string     `json:"description"`
}

func (s *HostService) Update(id uuid.UUID, req *UpdateHostRequest) (*model.Host, error) {
	host, err := s.hostRepo.GetByID(id)
	if err != nil {
		return nil, ErrHostNotFound
	}

	if req.Name != "" {
		host.Name = req.Name
	}
	if req.Hostname != "" {
		host.Hostname = req.Hostname
	}
	if req.Port > 0 {
		host.Port = req.Port
	}
	if req.Username != "" {
		host.Username = req.Username
	}
	if req.AuthType != "" {
		host.AuthType = req.AuthType
	}
	if req.Password != "" {
		host.Password = req.Password
	}
	if req.PrivateKey != "" {
		host.PrivateKey = req.PrivateKey
	}
	if req.OS != "" {
		host.OS = req.OS
	}
	if req.Arch != "" {
		host.Arch = req.Arch
	}
	if req.GroupID != nil {
		host.GroupID = req.GroupID
	}
	if req.Description != "" {
		host.Description = req.Description
	}

	if err := s.hostRepo.Update(host); err != nil {
		return nil, err
	}

	return s.hostRepo.GetByID(id)
}

func (s *HostService) Delete(id uuid.UUID) error {
	return s.hostRepo.Delete(id)
}

func (s *HostService) GetByID(id uuid.UUID) (*model.Host, error) {
	return s.hostRepo.GetByID(id)
}

func (s *HostService) List(page, pageSize int, groupID *uuid.UUID, keyword string, status *int) ([]model.Host, int64, error) {
	return s.hostRepo.List(page, pageSize, groupID, keyword, status)
}

// Test SSH connection
func (s *HostService) TestConnection(id uuid.UUID) error {
	host, err := s.hostRepo.GetByID(id)
	if err != nil {
		return ErrHostNotFound
	}

	var authMethod ssh.AuthMethod
	if host.AuthType == "key" {
		signer, err := ssh.ParsePrivateKey([]byte(host.PrivateKey))
		if err != nil {
			return err
		}
		authMethod = ssh.PublicKeys(signer)
	} else {
		authMethod = ssh.Password(host.Password)
	}

	config := &ssh.ClientConfig{
		User: host.Username,
		Auth: []ssh.AuthMethod{authMethod},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	addr := host.IP + ":" + strconv.Itoa(host.Port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		if statusErr := s.hostRepo.UpdateStatus(id, 0); statusErr != nil {
			log.Printf("Failed to update host status to offline: %v", statusErr)
		}
		return err
	}
	defer client.Close()

	if statusErr := s.hostRepo.UpdateStatus(id, 1); statusErr != nil {
		log.Printf("Failed to update host status to online: %v", statusErr)
	}
	return nil
}

// Host Group
type HostGroupService struct {
	groupRepo *repository.HostGroupRepository
}

func NewHostGroupService(groupRepo *repository.HostGroupRepository) *HostGroupService {
	return &HostGroupService{groupRepo: groupRepo}
}

func (s *HostGroupService) Create(name, description string, parentID *uuid.UUID) (*model.HostGroup, error) {
	group := &model.HostGroup{
		Name:        name,
		Description: description,
		ParentID:    parentID,
	}
	if err := s.groupRepo.Create(group); err != nil {
		return nil, err
	}
	return group, nil
}

func (s *HostGroupService) List() ([]model.HostGroup, error) {
	return s.groupRepo.List()
}

func (s *HostGroupService) Delete(id uuid.UUID) error {
	return s.groupRepo.Delete(id)
}

// Host Tag
type HostTagService struct {
	tagRepo *repository.HostTagRepository
}

func NewHostTagService(tagRepo *repository.HostTagRepository) *HostTagService {
	return &HostTagService{tagRepo: tagRepo}
}

func (s *HostTagService) Create(name, color string) (*model.HostTag, error) {
	tag := &model.HostTag{
		Name:  name,
		Color: color,
	}
	if err := s.tagRepo.Create(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

func (s *HostTagService) List() ([]model.HostTag, error) {
	return s.tagRepo.List()
}

func (s *HostTagService) Delete(id uuid.UUID) error {
	return s.tagRepo.Delete(id)
}
