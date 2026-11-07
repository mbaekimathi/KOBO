import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import { SESSION_NOTICE_KEY } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ login_code: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_NOTICE_KEY) === 'signed_in_elsewhere') {
      setNotice(
        'You were signed out because this account signed in on another device.',
      )
      sessionStorage.removeItem(SESSION_NOTICE_KEY)
    }
  }, [])

  if (!loading && isAuthenticated) {
    const dest =
      user.account_status === 'ACTIVE' && user.role !== 'PENDING'
        ? user.role_route
        : '/pending'
    return <Navigate to={dest} replace />
  }

  const onChange = (e) => {
    const { name, value } = e.target
    if (name === 'login_code' || name === 'password') {
      setForm((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, '').slice(0, 6),
      }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.login_code.length !== 6) {
      setError('Enter your 6-digit login code.')
      return
    }
    if (form.password.length !== 6) {
      setError('Password must be exactly 6 digits.')
      return
    }

    setSubmitting(true)
    try {
      const data = await login(form.login_code, form.password)
      navigate(data.redirect_to || '/pending', { replace: true })
    } catch (err) {
      const detail =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.login_code?.[0] ||
        err.response?.data?.detail ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        'Unable to sign in. Check your login code and password.'
      setError(detail)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual__glow" />
        <div className="auth-visual__content">
          <p className="eyebrow">Field data from Kenya</p>
          <h1>KOBO COLLECT</h1>
          <p>
            Capture household surveys and community insights from Kenyans in
            the field — securely, on tablets and phones, with role-based access
            for every team.
          </p>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your workspace</h2>
            <p className="muted">
              Use your 6-digit login code and 6-digit password. Active accounts
              go straight to their role page.
            </p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {notice ? <div className="alert alert--error">{notice}</div> : null}
            {error ? <div className="alert alert--error">{error}</div> : null}

            <label className="field">
              <span>6-digit login code</span>
              <input
                type="text"
                name="login_code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoComplete="username"
                required
                value={form.login_code}
                onChange={onChange}
                placeholder="123456"
              />
            </label>

            <PasswordField
              label="6-digit password"
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete="current-password"
            />

            <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-footer">
            New employee?{' '}
            <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
