import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import HostList from '@/pages/Monitor/HostList'
import AppList from '@/pages/Deploy/AppList'
import AppDetail from '@/pages/Deploy/AppDetail'
import PipelineList from '@/pages/Deploy/PipelineList'
import VersionList from '@/pages/Deploy/VersionList'
import ConfigList from '@/pages/Config/ConfigList'
import UserList from '@/pages/System/UserList'
import GroupList from '@/pages/System/GroupList'
import RolePermissionList from '@/pages/System/RolePermissionList'
import AuditLogList from '@/pages/System/AuditLogList'
import ClusterList from '@/pages/K8s/ClusterList'
import ClusterDetail from '@/pages/K8s/ClusterDetail'
import WorkloadList from '@/pages/K8s/WorkloadList'
import PodList from '@/pages/K8s/PodList'
import ServiceList from '@/pages/K8s/ServiceList'
import IngressList from '@/pages/K8s/IngressList'
import ConfigMapList from '@/pages/K8s/ConfigMapList'
import SecretList from '@/pages/K8s/SecretList'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/monitor/hosts" element={<HostList />} />
                <Route path="/deploy/apps" element={<AppList />} />
                <Route path="/deploy/apps/:id" element={<AppDetail />} />
                <Route path="/deploy/pipelines" element={<PipelineList />} />
                <Route path="/deploy/versions" element={<VersionList />} />
                {/* K8s - Cluster */}
                <Route path="/k8s/clusters" element={<ClusterList />} />
                <Route path="/k8s/clusters/:id" element={<ClusterDetail />} />
                {/* K8s - Workloads */}
                <Route path="/k8s/workloads/deployments" element={<WorkloadList kind="Deployment" />} />
                <Route path="/k8s/workloads/statefulsets" element={<WorkloadList kind="StatefulSet" />} />
                <Route path="/k8s/workloads/daemonsets" element={<WorkloadList kind="DaemonSet" />} />
                <Route path="/k8s/workloads/cronjobs" element={<WorkloadList kind="CronJob" />} />
                <Route path="/k8s/workloads/pods" element={<PodList />} />
                {/* K8s - Network */}
                <Route path="/k8s/network/services" element={<ServiceList />} />
                <Route path="/k8s/network/ingresses" element={<IngressList />} />
                {/* K8s - Config */}
                <Route path="/k8s/config/configmaps" element={<ConfigMapList />} />
                <Route path="/k8s/config/secrets" element={<SecretList />} />
                {/* Legacy redirects */}
                <Route path="/k8s/services" element={<Navigate to="/k8s/network/services" replace />} />
                <Route path="/k8s/pods" element={<Navigate to="/k8s/workloads/pods" replace />} />
                <Route path="/config" element={<ConfigList />} />
                <Route path="/system/users" element={<UserList />} />
                <Route path="/system/groups" element={<GroupList />} />
                <Route path="/system/roles" element={<RolePermissionList />} />
                <Route path="/system/audit-logs" element={<AuditLogList />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
