import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'

function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}

function initials(user) {
  const first = (user?.first_name || '').trim().charAt(0)
  const last = (user?.last_name || '').trim().charAt(0)
  return (first + last || 'KC').toUpperCase()
}

export default function ProfilePage() {
  const { user } = useAuth()
  const photo = mediaUrl(user?.profile_image)

  return (
    <AppShell
      title="Your profile"
      subtitle="Account details for your KOBO COLLECT session."
    >
      <section className="profile-panel">
        <div className="profile-panel__hero">
          <div className="profile-panel__photo" aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : <span>{initials(user)}</span>}
          </div>
          <div className="profile-panel__intro">
            <p className="eyebrow">Signed-in account</p>
            <h2>{user?.full_name}</h2>
            <div className="profile-panel__chips">
              <span className="badge badge--soft">{user?.role_display || user?.role}</span>
              <span className="badge badge--success">
                {user?.account_status_display || 'Status'}
              </span>
            </div>
          </div>
        </div>

        <dl className="detail-list detail-list--cards">
          <div>
            <dt>First name</dt>
            <dd>{user?.first_name || '—'}</dd>
          </div>
          <div>
            <dt>Middle name</dt>
            <dd>{user?.middle_name || '—'}</dd>
          </div>
          <div>
            <dt>Last name</dt>
            <dd>{user?.last_name || '—'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email || '—'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{user?.phone_display || '—'}</dd>
          </div>
          <div>
            <dt>Login code</dt>
            <dd>{user?.login_code || '—'}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user?.role_display || '—'}</dd>
          </div>
          <div>
            <dt>Account status</dt>
            <dd>{user?.account_status_display || '—'}</dd>
          </div>
        </dl>
      </section>
    </AppShell>
  )
}
