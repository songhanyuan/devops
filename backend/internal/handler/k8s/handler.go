package k8s

import (
	"strconv"

	"devops/internal/middleware"
	"devops/internal/pkg/response"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	k8sService *service.K8sService
}

func NewHandler(k8sService *service.K8sService) *Handler {
	return &Handler{k8sService: k8sService}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	clusters := r.Group("/clusters")
	{
		clusters.GET("", h.ListClusters)
		clusters.POST("", h.CreateCluster)
		clusters.GET("/:id", h.GetCluster)
		clusters.PUT("/:id", h.UpdateCluster)
		clusters.DELETE("/:id", h.DeleteCluster)
		clusters.POST("/:id/test", h.TestConnection)
		clusters.GET("/:id/yaml", h.GetResourceYAML)
		clusters.GET("/:id/history", h.GetYAMLHistory)
		clusters.POST("/:id/apply", h.ApplyYAML)
		clusters.POST("/:id/format", h.FormatYAML)
		clusters.GET("/:id/overview", h.GetClusterOverview)
		clusters.GET("/:id/nodes", h.GetNodes)
		clusters.GET("/:id/namespaces", h.GetNamespaces)
		clusters.GET("/:id/deployments", h.GetDeployments)
		clusters.GET("/:id/pods", h.GetPods)
		clusters.GET("/:id/services", h.GetServices)
	}
}

func (h *Handler) ListClusters(c *gin.Context) {
	page := getIntParam(c, "page", 1)
	pageSize := getIntParam(c, "page_size", 20)
	envCode := c.Query("env_code")
	keyword := c.Query("keyword")

	clusters, total, err := h.k8sService.ListClusters(page, pageSize, envCode, keyword)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessPage(c, clusters, total, page, pageSize)
}

func (h *Handler) CreateCluster(c *gin.Context) {
	var req service.CreateClusterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	claims := middleware.GetCurrentUser(c)
	cluster, err := h.k8sService.CreateCluster(&req, claims.UserID)
	if err != nil {
		if err == service.ErrClusterCodeExists {
			response.Error(c, 4001, "集群代码已存在")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, cluster)
}

func (h *Handler) GetCluster(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	cluster, err := h.k8sService.GetCluster(id)
	if err != nil {
		response.NotFound(c, "集群不存在")
		return
	}

	response.Success(c, cluster)
}

func (h *Handler) UpdateCluster(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req service.UpdateClusterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	cluster, err := h.k8sService.UpdateCluster(id, &req)
	if err != nil {
		if err == service.ErrClusterNotFound {
			response.NotFound(c, "集群不存在")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, cluster)
}

func (h *Handler) DeleteCluster(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	if err := h.k8sService.DeleteCluster(id); err != nil {
		if err == service.ErrClusterNotFound {
			response.NotFound(c, "集群不存在")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

func (h *Handler) TestConnection(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	overview, err := h.k8sService.TestConnection(id)
	if err != nil {
		if err == service.ErrClusterConnect {
			response.Error(c, 4002, "集群连接失败")
			return
		}
		response.ServerError(c, err.Error())
		return
	}

	response.SuccessWithMessage(c, "连接成功", overview)
}

func (h *Handler) GetClusterOverview(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	overview, err := h.k8sService.GetClusterOverview(id)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, overview)
}

func (h *Handler) GetNodes(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	nodes, err := h.k8sService.GetNodes(id)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, nodes)
}

func (h *Handler) GetNamespaces(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	namespaces, err := h.k8sService.GetNamespaces(id)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, namespaces)
}

func (h *Handler) GetDeployments(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	namespace := c.DefaultQuery("namespace", "")
	deployments, err := h.k8sService.GetDeployments(id, namespace)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, deployments)
}

func (h *Handler) GetPods(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	namespace := c.DefaultQuery("namespace", "")
	pods, err := h.k8sService.GetPods(id, namespace)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, pods)
}

func (h *Handler) GetServices(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	namespace := c.DefaultQuery("namespace", "")
	services, err := h.k8sService.GetServices(id, namespace)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, services)
}

func (h *Handler) GetResourceYAML(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	kind := c.Query("kind")
	name := c.Query("name")
	namespace := c.Query("namespace")
	if kind == "" || name == "" {
		response.BadRequest(c, "kind 与 name 必填")
		return
	}

	yaml, err := h.k8sService.GetResourceYAML(id, kind, name, namespace)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, yaml)
}

func (h *Handler) ApplyYAML(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	var req service.ApplyYAMLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	claims := middleware.GetCurrentUser(c)
	var createdBy uuid.UUID
	var username string
	if claims != nil {
		createdBy = claims.UserID
		username = claims.Username
	}

	results, err := h.k8sService.ApplyYAML(id, req.YAML, req.Namespace, req.DryRun, req.Action, createdBy, username)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	message := "YAML 已应用"
	if req.DryRun {
		message = "YAML 校验通过"
	}
	response.SuccessWithMessage(c, message, results)
}

func (h *Handler) GetYAMLHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "无效的ID")
		return
	}

	kind := c.Query("kind")
	name := c.Query("name")
	namespace := c.Query("namespace")
	limit := getIntParam(c, "limit", 20)
	if limit <= 0 {
		limit = 20
	}

	histories, err := h.k8sService.ListYAMLHistory(id, kind, namespace, name, limit)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, histories)
}

func (h *Handler) FormatYAML(c *gin.Context) {
	var req service.FormatYAMLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	formatted, err := h.k8sService.FormatYAML(req.YAML)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, formatted)
}

func getIntParam(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	if n, err := strconv.Atoi(val); err == nil {
		return n
	}
	return defaultVal
}
