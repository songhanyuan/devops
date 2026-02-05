package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Cluster struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"size:100;not null;index"`
	Code        string         `json:"code" gorm:"uniqueIndex;size:50;not null"`
	Version     string         `json:"version" gorm:"size:30"`
	APIServer   string         `json:"api_server" gorm:"size:255;not null"`
	KubeConfig  string         `json:"-" gorm:"type:text;not null"`           // 存储加密后的 kubeconfig
	Description string         `json:"description" gorm:"size:255"`
	EnvCode     string         `json:"env_code" gorm:"size:20;index"`         // dev/test/staging/prod
	Status      int            `json:"status" gorm:"default:1"`               // 1: 正常, 0: 不可用, 2: 连接失败
	NodeCount   int            `json:"node_count" gorm:"default:0"`
	PodCount    int            `json:"pod_count" gorm:"default:0"`
	LastCheckAt *time.Time     `json:"last_check_at"`
	CreatedBy   uuid.UUID      `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

func (c *Cluster) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// 以下为非持久化的运行时结构，用于 API 响应

type ClusterOverview struct {
	NodeCount     int              `json:"node_count"`
	ReadyNodes    int              `json:"ready_nodes"`
	PodCount      int              `json:"pod_count"`
	RunningPods   int              `json:"running_pods"`
	NamespaceCount int             `json:"namespace_count"`
	DeploymentCount int            `json:"deployment_count"`
	ServiceCount  int              `json:"service_count"`
	CPUCapacity   string           `json:"cpu_capacity"`
	CPUUsage      string           `json:"cpu_usage"`
	MemCapacity   string           `json:"mem_capacity"`
	MemUsage      string           `json:"mem_usage"`
	Version       string           `json:"version"`
}

type K8sNode struct {
	Name              string            `json:"name"`
	Status            string            `json:"status"`
	Roles             []string          `json:"roles"`
	InternalIP        string            `json:"internal_ip"`
	ExternalIP        string            `json:"external_ip"`
	OSImage           string            `json:"os_image"`
	KernelVersion     string            `json:"kernel_version"`
	ContainerRuntime  string            `json:"container_runtime"`
	KubeletVersion    string            `json:"kubelet_version"`
	CPUCapacity       string            `json:"cpu_capacity"`
	CPUAllocatable    string            `json:"cpu_allocatable"`
	MemoryCapacity    string            `json:"memory_capacity"`
	MemoryAllocatable string            `json:"memory_allocatable"`
	PodCapacity       string            `json:"pod_capacity"`
	CreatedAt         time.Time         `json:"created_at"`
	Conditions        []NodeCondition   `json:"conditions"`
}

type NodeCondition struct {
	Type    string `json:"type"`
	Status  string `json:"status"`
	Message string `json:"message"`
}

type K8sNamespace struct {
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Labels    map[string]string `json:"labels,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type K8sResource struct {
	Name      string    `json:"name"`
	Namespace string    `json:"namespace"`
	Kind      string    `json:"kind"`
	Replicas  int32     `json:"replicas,omitempty"`
	Ready     int32     `json:"ready,omitempty"`
	Status    string    `json:"status"`
	Images    []string  `json:"images,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type K8sYAMLHistory struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	ClusterID uuid.UUID `json:"cluster_id" gorm:"type:uuid;index:idx_k8s_yaml_resource,priority:1"`
	Kind      string    `json:"kind" gorm:"size:40;index:idx_k8s_yaml_resource,priority:2"`
	Namespace string    `json:"namespace" gorm:"size:200;index:idx_k8s_yaml_resource,priority:3"`
	Name      string    `json:"name" gorm:"size:200;index:idx_k8s_yaml_resource,priority:4"`
	YAML      string    `json:"yaml" gorm:"type:text"`
	Action    string    `json:"action" gorm:"size:20"`
	CreatedBy uuid.UUID `json:"created_by" gorm:"type:uuid"`
	Username  string    `json:"username" gorm:"size:50"`
	CreatedAt time.Time `json:"created_at" gorm:"index"`
}

func (h *K8sYAMLHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}
