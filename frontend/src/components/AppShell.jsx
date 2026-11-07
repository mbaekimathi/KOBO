import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RegisterClientModal from './RegisterClientModal'

const ROLE_LABELS = {
  ADMIN: 'Admin',
  IT_SUPPORT: 'IT Support',
  DATA_ENTRY: 'Data Entry',
  PENDING: 'Pending',
}

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

function formatClock(date) {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
  const day = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)

  return { weekday, day, time }
}

function BrandMark({ to, variant = 'sidebar', onClick }) {
  return (
    <Link to={to} className={`brand-mark brand-mark--${variant}`} onClick={onClick}>
      <span className="brand-mark__mark" aria-hidden="true">
        <span className="brand-mark__dot" />
      </span>
      <span className="brand-mark__text">
        KOBO
        <small>COLLECT</small>
      </span>
    </Link>
  )
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const menuRef = useRef(null)

  const roleLabel = user?.role_display || ROLE_LABELS[user?.role] || 'Staff'
  const photo = mediaUrl(user?.profile_image)
  const homePath = user?.role_route || '/pending'
  const year = new Date().getFullYear()
  const clock = formatClock(now)
  const canRegisterClients = ['ADMIN', 'IT_SUPPORT', 'DATA_ENTRY'].includes(user?.role)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  useEffect(() => {
    if (!sidebarOpen && !menuOpen) return undefined
    if (registerOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setSidebarOpen(false)
      setMenuOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen, menuOpen, registerOpen])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [sidebarOpen])

  const closeSidebar = () => setSidebarOpen(false)

  const handleLogout = async () => {
    setMenuOpen(false)
    setSidebarOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div className={`app-shell${sidebarOpen ? ' is-sidebar-open' : ''}`}>
      <button
        type="button"
        className="app-sidebar-backdrop"
        aria-label="Close sidebar"
        tabIndex={sidebarOpen ? 0 : -1}
        onClick={closeSidebar}
      />

      <aside
        className="app-sidebar"
        aria-label="Workspace sidebar"
        id="app-sidebar"
      >
        <div className="app-sidebar__glow" aria-hidden="true" />

        <div className="app-sidebar__top">
          <div className="app-sidebar__top-row">
            <BrandMark to={homePath} variant="sidebar" onClick={closeSidebar} />
            <button
              type="button"
              className="app-sidebar__close"
              aria-label="Close sidebar"
              onClick={closeSidebar}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className="app-sidebar__tagline">Field data platform</p>
        </div>

        <nav className="app-sidebar__nav" aria-label="Primary">
          {canRegisterClients ? (
            <>
              <NavLink
                to="/daily-details"
                className={() => {
                  const active =
                    location.pathname === '/daily-details' ||
                    location.pathname === '/data-entry'
                  return `app-sidebar__link${active ? ' is-active' : ''}`
                }}
                onClick={() => {
                  setSidebarOpen(false)
                  setMenuOpen(false)
                }}
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M8 4.5h8M7 8h10v11.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5V8Zm3.2 4.2h3.6M8.8 8V6.4A1.4 1.4 0 0 1 10.2 5h3.6a1.4 1.4 0 0 1 1.4 1.4V8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="app-sidebar__link-copy">
                  <strong>Daily details</strong>
                  <small>Location, cadre & site</small>
                </span>
              </NavLink>

              <button
                type="button"
                className="app-sidebar__link"
                onClick={() => {
                  setSidebarOpen(false)
                  setMenuOpen(false)
                  setRegisterOpen(true)
                }}
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M12 12a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12Zm-7.5 8.25v-.6A5.65 5.65 0 0 1 10.15 14h3.7a5.65 5.65 0 0 1 5.65 5.65v.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.4 7.2v3.4m1.7-1.7h-3.4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="app-sidebar__link-copy">
                  <strong>Register client</strong>
                  <small>Add a new field record</small>
                </span>
              </button>

              <NavLink
                to="/clients"
                className={({ isActive }) =>
                  `app-sidebar__link${isActive ? ' is-active' : ''}`
                }
                onClick={() => {
                  setSidebarOpen(false)
                  setMenuOpen(false)
                }}
              >
                <span className="app-sidebar__link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M8 7h11M8 12h11M8 17h11M5 7h.01M5 12h.01M5 17h.01"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="app-sidebar__link-copy">
                  <strong>My clients</strong>
                  <small>View all client records</small>
                </span>
              </NavLink>
            </>
          ) : null}
        </nav>
        <div className="app-sidebar__bottom">
          <button
            type="button"
            className="app-sidebar__signout"
            onClick={handleLogout}
          >
            Sign out
          </button>

          <div className="app-sidebar__user">
            <div className="app-sidebar__avatar" aria-hidden="true">
              {photo ? <img src={photo} alt="" /> : <span>{initials(user)}</span>}
              <span className="app-sidebar__online" title="Active session" />
            </div>
            <div className="app-sidebar__user-meta">
              <strong>{user?.first_name || 'User'}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-frame">
        <header className="app-header">
          <div className="app-header__mobile-brand">
            <button
              type="button"
              className="app-menu-toggle"
              aria-label="Open sidebar"
              aria-controls="app-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => {
                setMenuOpen(false)
                setSidebarOpen(true)
              }}
            >
              <span className="app-menu-toggle__bars" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            <BrandMark to={homePath} variant="mobile" />
          </div>

          <div className="live-clock" aria-live="polite">
            <span className="live-clock__pulse" aria-hidden="true" />
            <div className="live-clock__copy">
              <span className="live-clock__date">
                {clock.weekday} · {clock.day}
              </span>
              <strong className="live-clock__time">{clock.time}</strong>
            </div>
          </div>

          <div className="profile-menu" ref={menuRef}>
            <button
              type="button"
              className={`profile-menu__trigger${menuOpen ? ' is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              onClick={() => {
                setSidebarOpen(false)
                setMenuOpen((open) => !open)
              }}
            >
              <span className="profile-menu__avatar" aria-hidden="true">
                {photo ? <img src={photo} alt="" /> : <span>{initials(user)}</span>}
              </span>
              <span className="profile-menu__copy">
                <strong>{user?.first_name || 'Profile'}</strong>
                <small>{roleLabel}</small>
              </span>
              <span className="profile-menu__caret" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div className="profile-menu__dropdown" role="menu">
                <div className="profile-menu__summary">
                  <strong>{user?.full_name || user?.first_name}</strong>
                  <span>{user?.email}</span>
                </div>
                <Link
                  to="/profile"
                  role="menuitem"
                  className="profile-menu__item"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="profile-menu__item profile-menu__item--danger"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="app-main">
          <div className="app-main__surface">{children}</div>
        </main>

        <footer className="app-footer">
          <div className="app-footer__brand">
            <span className="app-footer__mark" aria-hidden="true" />
            <p>© {year} KOBO COLLECT</p>
          </div>
          <p className="app-footer__meta">Secure field data for NGO operations</p>
        </footer>
      </div>

      <RegisterClientModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}
