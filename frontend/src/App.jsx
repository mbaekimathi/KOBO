import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import ClientAccountPage from './pages/ClientAccountPage'
import ClientsPage from './pages/ClientsPage'
import DailyDetailsPage from './pages/DailyDetailsPage'
import DataEntryDashboard from './pages/DataEntryDashboard'
import ItSupportDashboard from './pages/ItSupportDashboard'
import LoginPage from './pages/LoginPage'
import PendingPage from './pages/PendingPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import { useAuth } from './context/AuthContext'

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="page-center">
        <div className="loader" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (user.account_status !== 'ACTIVE' || user.role === 'PENDING') {
    return <Navigate to="/pending" replace />
  }

  return <Navigate to={user.role_route} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/pending"
        element={
          <ProtectedRoute>
            <PendingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/it-support"
        element={
          <ProtectedRoute roles={['IT_SUPPORT']}>
            <ItSupportDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/data-entry"
        element={
          <ProtectedRoute roles={['DATA_ENTRY']}>
            <DataEntryDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daily-details"
        element={
          <ProtectedRoute roles={['ADMIN', 'IT_SUPPORT', 'DATA_ENTRY']}>
            <DailyDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute roles={['ADMIN', 'IT_SUPPORT', 'DATA_ENTRY']}>
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute roles={['ADMIN', 'IT_SUPPORT', 'DATA_ENTRY']}>
            <ClientAccountPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}