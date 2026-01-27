package service

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	ErrClusterNotFound  = errors.New("cluster not found")
	ErrClusterCodeExists = errors.New("cluster code already exists")
	ErrClusterConnect   = errors.New("failed to connect to cluster")
)

type K8sService struct {
	clusterRepo *repository.ClusterRepository
	encryptKey  []byte
}

func NewK8sService(clusterRepo *repository.ClusterRepository, encryptKey string) *K8sService {
	key := []byte(encryptKey)
	if len(key) < 32 {
		padded := make([]byte, 32)
		copy(padded, key)
		key = padded
	}
	return &K8sService{
		clusterRepo: clusterRepo,
		encryptKey:  key[:32],
	}
}

// --- Cluster CRUD ---

type CreateClusterRequest struct {
	Name        string `json:"name" binding:"required"`
	Code        string `json:"code" binding:"required"`
	APIServer   string `json:"api_server" binding:"required"`
	KubeConfig  string `json:"kubeconfig" binding:"required"`
	EnvCode     string `json:"env_code"`
	Description string `json:"description"`
}

func (s *K8sService) CreateCluster(req *CreateClusterRequest, createdBy uuid.UUID) (*model.Cluster, error) {
	if _, err := s.clusterRepo.GetByCode(req.Code); err == nil {
		return nil, ErrClusterCodeExists
	}

	// Encrypt kubeconfig
	encrypted, err := s.encrypt(req.KubeConfig)
	if err != nil {
		return nil, fmt.Errorf("encrypt kubeconfig: %w", err)
	}

	cluster := &model.Cluster{
		Name:        req.Name,
		Code:        req.Code,
		APIServer:   req.APIServer,
		KubeConfig:  encrypted,
		EnvCode:     req.EnvCode,
		Description: req.Description,
		Status:      1,
		CreatedBy:   createdBy,
	}

	// Test connection and get version
	client, err := s.getClient(req.KubeConfig)
	if err == nil {
		ver, verErr := client.Discovery().ServerVersion()
		if verErr == nil {
			cluster.Version = ver.GitVersion
		}
		// Get node/pod count
		nodes, _ := client.CoreV1().Nodes().List(context.Background(), metav1.ListOptions{})
		if nodes != nil {
			cluster.NodeCount = len(nodes.Items)
		}
		pods, _ := client.CoreV1().Pods("").List(context.Background(), metav1.ListOptions{})
		if pods != nil {
			cluster.PodCount = len(pods.Items)
		}
		now := time.Now()
		cluster.LastCheckAt = &now
	} else {
		cluster.Status = 2 // 连接失败
	}

	if err := s.clusterRepo.Create(cluster); err != nil {
		return nil, err
	}

	return s.clusterRepo.GetByID(cluster.ID)
}

type UpdateClusterRequest struct {
	Name        string `json:"name"`
	APIServer   string `json:"api_server"`
	KubeConfig  string `json:"kubeconfig"`
	EnvCode     string `json:"env_code"`
	Description string `json:"description"`
}

func (s *K8sService) UpdateCluster(id uuid.UUID, req *UpdateClusterRequest) (*model.Cluster, error) {
	cluster, err := s.clusterRepo.GetByID(id)
	if err != nil {
		return nil, ErrClusterNotFound
	}

	if req.Name != "" {
		cluster.Name = req.Name
	}
	if req.APIServer != "" {
		cluster.APIServer = req.APIServer
	}
	if req.KubeConfig != "" {
		encrypted, err := s.encrypt(req.KubeConfig)
		if err != nil {
			return nil, fmt.Errorf("encrypt kubeconfig: %w", err)
		}
		cluster.KubeConfig = encrypted
	}
	if req.EnvCode != "" {
		cluster.EnvCode = req.EnvCode
	}
	if req.Description != "" {
		cluster.Description = req.Description
	}

	if err := s.clusterRepo.Update(cluster); err != nil {
		return nil, err
	}

	return s.clusterRepo.GetByID(id)
}

func (s *K8sService) DeleteCluster(id uuid.UUID) error {
	if _, err := s.clusterRepo.GetByID(id); err != nil {
		return ErrClusterNotFound
	}
	return s.clusterRepo.Delete(id)
}

func (s *K8sService) GetCluster(id uuid.UUID) (*model.Cluster, error) {
	return s.clusterRepo.GetByID(id)
}

func (s *K8sService) ListClusters(page, pageSize int, envCode, keyword string) ([]model.Cluster, int64, error) {
	return s.clusterRepo.List(page, pageSize, envCode, keyword)
}

// --- 连接测试 ---

func (s *K8sService) TestConnection(id uuid.UUID) (*model.ClusterOverview, error) {
	cluster, err := s.clusterRepo.GetByID(id)
	if err != nil {
		return nil, ErrClusterNotFound
	}

	kubeconfig, err := s.decrypt(cluster.KubeConfig)
	if err != nil {
		return nil, fmt.Errorf("decrypt kubeconfig: %w", err)
	}

	client, err := s.getClient(kubeconfig)
	if err != nil {
		s.clusterRepo.UpdateStatus(id, 2, 0, 0)
		return nil, ErrClusterConnect
	}

	overview, err := s.getClusterOverview(client)
	if err != nil {
		s.clusterRepo.UpdateStatus(id, 2, 0, 0)
		return nil, err
	}

	s.clusterRepo.UpdateStatus(id, 1, overview.NodeCount, overview.PodCount)
	return overview, nil
}

// --- 资源查询 ---

func (s *K8sService) GetClusterOverview(id uuid.UUID) (*model.ClusterOverview, error) {
	client, err := s.getClientByClusterID(id)
	if err != nil {
		return nil, err
	}
	return s.getClusterOverview(client)
}

func (s *K8sService) GetNodes(id uuid.UUID) ([]model.K8sNode, error) {
	client, err := s.getClientByClusterID(id)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	nodeList, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list nodes: %w", err)
	}

	var nodes []model.K8sNode
	for _, n := range nodeList.Items {
		node := model.K8sNode{
			Name:              n.Name,
			OSImage:           n.Status.NodeInfo.OSImage,
			KernelVersion:     n.Status.NodeInfo.KernelVersion,
			ContainerRuntime:  n.Status.NodeInfo.ContainerRuntimeVersion,
			KubeletVersion:    n.Status.NodeInfo.KubeletVersion,
			CPUCapacity:       n.Status.Capacity.Cpu().String(),
			CPUAllocatable:    n.Status.Allocatable.Cpu().String(),
			MemoryCapacity:    n.Status.Capacity.Memory().String(),
			MemoryAllocatable: n.Status.Allocatable.Memory().String(),
			PodCapacity:       n.Status.Capacity.Pods().String(),
			CreatedAt:         n.CreationTimestamp.Time,
		}

		// Roles
		for label := range n.Labels {
			if strings.HasPrefix(label, "node-role.kubernetes.io/") {
				role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
				if role != "" {
					node.Roles = append(node.Roles, role)
				}
			}
		}
		if len(node.Roles) == 0 {
			node.Roles = []string{"worker"}
		}

		// IPs
		for _, addr := range n.Status.Addresses {
			switch addr.Type {
			case corev1.NodeInternalIP:
				node.InternalIP = addr.Address
			case corev1.NodeExternalIP:
				node.ExternalIP = addr.Address
			}
		}

		// Status
		node.Status = "NotReady"
		for _, cond := range n.Status.Conditions {
			node.Conditions = append(node.Conditions, model.NodeCondition{
				Type:    string(cond.Type),
				Status:  string(cond.Status),
				Message: cond.Message,
			})
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				node.Status = "Ready"
			}
		}

		nodes = append(nodes, node)
	}

	return nodes, nil
}

func (s *K8sService) GetNamespaces(id uuid.UUID) ([]model.K8sNamespace, error) {
	client, err := s.getClientByClusterID(id)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	nsList, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list namespaces: %w", err)
	}

	var namespaces []model.K8sNamespace
	for _, ns := range nsList.Items {
		namespaces = append(namespaces, model.K8sNamespace{
			Name:      ns.Name,
			Status:    string(ns.Status.Phase),
			Labels:    ns.Labels,
			CreatedAt: ns.CreationTimestamp.Time,
		})
	}

	return namespaces, nil
}

func (s *K8sService) GetDeployments(id uuid.UUID, namespace string) ([]model.K8sResource, error) {
	client, err := s.getClientByClusterID(id)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	deployList, err := client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list deployments: %w", err)
	}

	var resources []model.K8sResource
	for _, d := range deployList.Items {
		status := "Running"
		if d.Status.ReadyReplicas < *d.Spec.Replicas {
			status = "Progressing"
		}
		if d.Status.ReadyReplicas == 0 && *d.Spec.Replicas > 0 {
			status = "NotReady"
		}

		var images []string
		for _, c := range d.Spec.Template.Spec.Containers {
			images = append(images, c.Image)
		}

		resources = append(resources, model.K8sResource{
			Name:      d.Name,
			Namespace: d.Namespace,
			Kind:      "Deployment",
			Replicas:  *d.Spec.Replicas,
			Ready:     d.Status.ReadyReplicas,
			Status:    status,
			Images:    images,
			CreatedAt: d.CreationTimestamp.Time,
		})
	}

	return resources, nil
}

func (s *K8sService) GetPods(id uuid.UUID, namespace string) ([]model.K8sResource, error) {
	client, err := s.getClientByClusterID(id)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	podList, err := client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list pods: %w", err)
	}

	var resources []model.K8sResource
	for _, p := range podList.Items {
		var images []string
		for _, c := range p.Spec.Containers {
			images = append(images, c.Image)
		}

		resources = append(resources, model.K8sResource{
			Name:      p.Name,
			Namespace: p.Namespace,
			Kind:      "Pod",
			Status:    string(p.Status.Phase),
			Images:    images,
			CreatedAt: p.CreationTimestamp.Time,
		})
	}

	return resources, nil
}

func (s *K8sService) GetServices(id uuid.UUID, namespace string) ([]model.K8sResource, error) {
	client, err := s.getClientByClusterID(id)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	svcList, err := client.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("list services: %w", err)
	}

	var resources []model.K8sResource
	for _, svc := range svcList.Items {
		resources = append(resources, model.K8sResource{
			Name:      svc.Name,
			Namespace: svc.Namespace,
			Kind:      "Service",
			Status:    string(svc.Spec.Type),
			CreatedAt: svc.CreationTimestamp.Time,
		})
	}

	return resources, nil
}

// --- 内部方法 ---

func (s *K8sService) getClient(kubeconfig string) (*kubernetes.Clientset, error) {
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	if err != nil {
		return nil, fmt.Errorf("parse kubeconfig: %w", err)
	}

	config.Timeout = 10 * time.Second

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	return client, nil
}

func (s *K8sService) getClientByClusterID(id uuid.UUID) (*kubernetes.Clientset, error) {
	cluster, err := s.clusterRepo.GetByID(id)
	if err != nil {
		return nil, ErrClusterNotFound
	}

	kubeconfig, err := s.decrypt(cluster.KubeConfig)
	if err != nil {
		return nil, fmt.Errorf("decrypt kubeconfig: %w", err)
	}

	return s.getClient(kubeconfig)
}

func (s *K8sService) getClusterOverview(client *kubernetes.Clientset) (*model.ClusterOverview, error) {
	ctx := context.Background()
	overview := &model.ClusterOverview{}

	// Version
	ver, err := client.Discovery().ServerVersion()
	if err != nil {
		return nil, fmt.Errorf("get server version: %w", err)
	}
	overview.Version = ver.GitVersion

	// Nodes
	nodes, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err == nil {
		overview.NodeCount = len(nodes.Items)
		for _, n := range nodes.Items {
			for _, cond := range n.Status.Conditions {
				if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
					overview.ReadyNodes++
				}
			}
		}
	}

	// Pods
	pods, err := client.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err == nil {
		overview.PodCount = len(pods.Items)
		for _, p := range pods.Items {
			if p.Status.Phase == corev1.PodRunning {
				overview.RunningPods++
			}
		}
	}

	// Namespaces
	namespaces, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err == nil {
		overview.NamespaceCount = len(namespaces.Items)
	}

	// Deployments
	deployments, err := client.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err == nil {
		overview.DeploymentCount = len(deployments.Items)
	}

	// Services
	services, err := client.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err == nil {
		overview.ServiceCount = len(services.Items)
	}

	_ = appsv1.SchemeGroupVersion // keep import

	return overview, nil
}

// Encryption helpers
func (s *K8sService) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *K8sService) decrypt(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}
