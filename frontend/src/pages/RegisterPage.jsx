import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PasswordField from '../components/PasswordField'
import PhoneInput from '../components/PhoneInput'
import { useAuth } from '../context/AuthContext'
import { DEFAULT_COUNTRY } from '../data/countries'

const INITIAL = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  login_code: '',
  phone_country_code: DEFAULT_COUNTRY.dial,
  phone_number: '',
  password: '',
  password_confirm: '',
}

const UPPERCASE_FIELDS = new Set(['first_name', 'middle_name', 'last_name'])

export default function RegisterPage() {
  const { register, isAuthenticated, user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [profileImage, setProfileImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    const dest =
      user.account_status === 'ACTIVE' && user.role !== 'PENDING'
        ? user.role_route
        : '/pending'
    return <Navigate to={dest} replace />
  }

  const onChange = (e) => {
    const { name, value } = e.target

    if (name === 'login_code' || name === 'password' || name === 'password_confirm') {
      setForm((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, '').slice(0, 6),
      }))
      return
    }

    if (name === 'email') {
      setForm((prev) => ({ ...prev, email: value.toLowerCase() }))
      return
    }

    if (UPPERCASE_FIELDS.has(name)) {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onProfileChange = (e) => {
    const file = e.target.files?.[0] || null
    setProfileImage(file)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(file ? URL.createObjectURL(file) : '')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.login_code.length !== 6) {
      setError('Login code must be exactly 6 digits.')
      return
    }
    if (form.password.length !== 6 || form.password_confirm.length !== 6) {
      setError('Password must be exactly 6 digits.')
      return
    }
    if (form.password !== form.password_confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!form.phone_number || form.phone_number.length < 7) {
      setError('Enter a valid phone number.')
      return
    }

    const payload = new FormData()
    payload.append('first_name', form.first_name.trim().toUpperCase())
    payload.append('middle_name', form.middle_name.trim().toUpperCase())
    payload.append('last_name', form.last_name.trim().toUpperCase())
    payload.append('email', form.email.trim().toLowerCase())
    payload.append('login_code', form.login_code)
    payload.append('phone_country_code', form.phone_country_code)
    payload.append('phone_number', form.phone_number)
    payload.append('password', form.password)
    payload.append('password_confirm', form.password_confirm)
    if (profileImage) {
      payload.append('profile_image', profileImage)
    }

    setSubmitting(true)
    try {
      const data = await register(payload)
      setSuccess(data.message)
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0]
        const value = data[firstKey]
        setError(Array.isArray(value) ? value[0] : String(value))
      } else {
        setError('Unable to create account. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-visual auth-visual--alt" aria-hidden="true">
        <div className="auth-visual__glow" />
        <div className="auth-visual__content">
          <p className="eyebrow">Join Kenya’s field team</p>
          <h1>Create employee access</h1>
          <p>
            Join enumerators collecting data from Kenyan communities. Register
            with your names, email, phone, and a unique 6-digit login code —
            accounts stay pending until verification and role allocation.
          </p>
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-card auth-card--wide">
          <div className="auth-card__header">
            <p className="eyebrow">Employee registration</p>
            <h2>Create your account</h2>
            <p className="muted">
              Names are uppercase, email is lowercase, and password is a 6-digit
              code. Profile photo is optional.
            </p>
          </div>

          <form className="auth-form auth-form--grid" onSubmit={onSubmit}>
            {error ? <div className="alert alert--error auth-form__full">{error}</div> : null}
            {success ? <div className="alert alert--success auth-form__full">{success}</div> : null}

            <label className="field">
              <span>First name</span>
              <input
                name="first_name"
                required
                className="input-uppercase"
                value={form.first_name}
                onChange={onChange}
                placeholder="JANE"
              />
            </label>

            <label className="field">
              <span>Middle name</span>
              <input
                name="middle_name"
                className="input-uppercase"
                value={form.middle_name}
                onChange={onChange}
                placeholder="A"
              />
            </label>

            <label className="field auth-form__full">
              <span>Last name</span>
              <input
                name="last_name"
                required
                className="input-uppercase"
                value={form.last_name}
                onChange={onChange}
                placeholder="FIELD"
              />
            </label>

            <label className="field auth-form__full">
              <span>Email</span>
              <input
                type="email"
                name="email"
                required
                className="input-lowercase"
                value={form.email}
                onChange={onChange}
                placeholder="you@organization.org"
              />
            </label>

            <PhoneInput
              countryCode={form.phone_country_code}
              phoneNumber={form.phone_number}
              required
              onCountryChange={(value) =>
                setForm((prev) => ({ ...prev, phone_country_code: value }))
              }
              onPhoneChange={(value) =>
                setForm((prev) => ({ ...prev, phone_number: value }))
              }
            />

            <label className="field auth-form__full">
              <span>6-digit login code</span>
              <input
                type="text"
                name="login_code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
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
              autoComplete="new-password"
            />

            <PasswordField
              label="Confirm 6-digit password"
              name="password_confirm"
              value={form.password_confirm}
              onChange={onChange}
              autoComplete="new-password"
            />

            <label className="field auth-form__full">
              <span>Upload profile (optional)</span>
              <input type="file" accept="image/*" onChange={onProfileChange} />
            </label>

            {preview ? (
              <div className="profile-preview auth-form__full">
                <img src={preview} alt="Profile preview" />
              </div>
            ) : null}

            <button
              className="btn btn--primary btn--block auth-form__full"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
