import { Navigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'

export default function PendingPage() {
  const { user, refreshProfile } = useAuth()

  if (user?.account_status === 'ACTIVE' && user?.role !== 'PENDING') {
    return <Navigate to={user.role_route} replace />
  }

  const isVerification = user?.account_status === 'PENDING_VERIFICATION' || !user?.is_verified
  const isRole = user?.is_verified && user?.role === 'PENDING'

  return (
    <AppShell
      title="Account pending"
      subtitle="Your access is being prepared by an administrator."
    >
      <section className="status-grid">
        <article className={`status-card ${isVerification ? 'is-active' : 'is-done'}`}>
          <div className="status-card__top">
            <span className="status-card__step">01</span>
            <p className="eyebrow">{isVerification ? 'Current step' : 'Completed'}</p>
          </div>
          <h2>Pending verification</h2>
          <p>
            An administrator must confirm your employee identity before you can
            access any workspace tools.
          </p>
        </article>

        <article
          className={`status-card ${isRole ? 'is-active' : isVerification ? '' : 'is-done'}`}
        >
          <div className="status-card__top">
            <span className="status-card__step">02</span>
            <p className="eyebrow">{isRole ? 'Current step' : 'Next step'}</p>
          </div>
          <h2>Pending role allocation</h2>
          <p>
            Once verified, you will be assigned Admin, IT Support, or Data Entry
            and redirected to that role page on your next login.
          </p>
        </article>
      </section>

      <section className="panel">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Registration</p>
            <h3>Your account details</h3>
          </div>
          <button type="button" className="btn btn--secondary" onClick={() => refreshProfile()}>
            Refresh status
          </button>
        </div>
        <dl className="detail-list detail-list--cards">
          <div>
            <dt>Name</dt>
            <dd>{user?.full_name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{user?.phone_display || '—'}</dd>
          </div>
          <div>
            <dt>Login code</dt>
            <dd>{user?.login_code}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className="badge badge--warning">{user?.account_status_display}</span>
            </dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>
              <span className="badge badge--soft">{user?.role_display}</span>
            </dd>
          </div>
        </dl>
      </section>
    </AppShell>
  )
}
