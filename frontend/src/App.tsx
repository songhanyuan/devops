import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import HostList from '@/pages/Monitor/HostList'
import AppList from '@/pages/Deploy/AppList'
import AppDetail from '@/pages/Deploy/AppDetail'
import ConfigList from '@/pages/Config/ConfigList'
import UserList from '@/pages/System/UserList'
import ClusterList from '@/pages/K8s/ClusterList'
import ClusterDetail from '@/pages/K8s/ClusterDetail'

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
                <Route path="/k8s/clusters" element={<ClusterList />} />
                <Route path="/k8s/clusters/:id" element={<ClusterDetail />} />
                <Route path="/config" element={<ConfigList />} />
                <Route path="/system/users" element={<UserList />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default App
