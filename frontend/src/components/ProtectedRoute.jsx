import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-center">
        <div className="loader" aria-label="Loading" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.account_status !== 'ACTIVE' || user.role === 'PENDING') {
    if (location.pathname !== '/pending' && location.pathname !== '/profile') {
      return <Navigate to="/pending" replace />
    }
    return children
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role_route || '/pending'} replace />
  }

  return children
}