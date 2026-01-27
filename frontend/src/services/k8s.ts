import api, { PageData } from './api'

export interface Cluster {
  id: string
  name: string
  code: string
  version: string
  api_server: string
  description: string
  env_code: string
  status: number
  node_count: number
  pod_count: number
  last_check_at: string
  created_at: string
}

export interface ClusterOverview {
  node_count: number
  ready_nodes: number
  pod_count: number
  running_pods: number
  namespace_count: number
  deployment_count: number
  service_count: number
  cpu_capacity: string
  cpu_usage: string
  mem_capacity: string
  mem_usage: string
  version: string
}

export interface K8sNode {
  name: string
  status: string
  roles: string[]
  internal_ip: string
  external_ip: string
  os_image: string
  kernel_version: string
  container_runtime: string
  kubelet_version: string
  cpu_capacity: string
  cpu_allocatable: string
  memory_capacity: string
  memory_allocatable: string
  pod_capacity: string
  created_at: string
  conditions: { type: string; status: string; message: string }[]
}

export interface K8sNamespace {
  name: string
  status: string
  labels: Record<string, string>
  created_at: string
}

export interface K8sResource {
  name: string
  namespace: string
  kind: string
  replicas: number
  ready: number
  status: string
  images: string[]
  created_at: string
}

export const k8sService = {
  // Cluster CRUD
  listClusters: (params: { page?: number; page_size?: number; env_code?: string; keyword?: string }) =>
    api.get<unknown, { data: PageData<Cluster> }>('/clusters', { params }),

  createCluster: (data: { name: string; code: string; api_server: string; kubeconfig: string; env_code?: string; description?: string }) =>
    api.post<unknown, { data: Cluster }>('/clusters', data),

  getCluster: (id: string) =>
    api.get<unknown, { data: Cluster }>(`/clusters/${id}`),

  updateCluster: (id: string, data: { name?: string; api_server?: string; kubeconfig?: string; env_code?: string; description?: string }) =>
    api.put<unknown, { data: Cluster }>(`/clusters/${id}`, data),

  deleteCluster: (id: string) =>
    api.delete(`/clusters/${id}`),

  // Connection test
  testConnection: (id: string) =>
    api.post<unknown, { data: ClusterOverview; message: string }>(`/clusters/${id}/test`),

  // Cluster resources
  getOverview: (id: string) =>
    api.get<unknown, { data: ClusterOverview }>(`/clusters/${id}/overview`),

  getNodes: (id: string) =>
    api.get<unknown, { data: K8sNode[] }>(`/clusters/${id}/nodes`),

  getNamespaces: (id: string) =>
    api.get<unknown, { data: K8sNamespace[] }>(`/clusters/${id}/namespaces`),

  getDeployments: (id: string, namespace?: string) =>
    api.get<unknown, { data: K8sResource[] }>(`/clusters/${id}/deployments`, { params: { namespace } }),

  getPods: (id: string, namespace?: string) =>
    api.get<unknown, { data: K8sResource[] }>(`/clusters/${id}/pods`, { params: { namespace } }),

  getServices: (id: string, namespace?: string) =>
    api.get<unknown, { data: K8sResource[] }>(`/clusters/${id}/services`, { params: { namespace } }),
}
