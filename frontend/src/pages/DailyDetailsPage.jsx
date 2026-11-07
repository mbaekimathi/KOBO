import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import AppShell from '../components/AppShell'
import { COUNTRIES } from '../data/countries'
import {
  CADRE_OPTIONS,
  DISTRIBUTION_POINT_OPTIONS,
  IMPLEMENTING_PARTNER_OPTIONS,
  KENYA_COUNTIES,
} from '../data/kenyaLocations'

const EMPTY = {
  country: 'Kenya',
  county: '',
  subcounty: '',
  cadre: '',
  cadre_other: '',
  distribution_point: '',
  distribution_point_other: '',
  facility_name: '',
  implementing_partner: '',
  implementing_partner_other: '',
}

function firstError(err) {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) {
    if (data.trim().startsWith('<')) {
      return 'Server error while saving. Please try again.'
    }
    return data
  }
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && data.detail[0]) return String(data.detail[0])
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value[0]) return String(value[0])
      if (typeof value === 'string' && value.trim()) return value
    }
  }
  if (!err?.response) {
    return 'Cannot reach the server. Check that the API is running, then try again.'
  }
  return `Unable to save daily details (${err.response.status}).`
}

function formatWorkDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${iso}T00:00:00`))
  } catch {
    return iso
  }
}

export default function DailyDetailsPage() {
  const [form, setForm] = useState(EMPTY)
  const [workDate, setWorkDate] = useState('')
  const [savedId, setSavedId] = useState(null)
  const [isPrefill, setIsPrefill] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isKenya = form.country.trim().toLowerCase() === 'kenya'
  const countyOptions = useMemo(() => {
    if (!isKenya) return []
    if (form.county && !KENYA_COUNTIES.includes(form.county)) {
      return [form.county, ...KENYA_COUNTIES]
    }
    return KENYA_COUNTIES
  }, [form.county, isKenya])

  const loadToday = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/daily-details/today/')
      setForm({
        country: data.country || 'Kenya',
        county: data.county || '',
        subcounty: data.subcounty || '',
        cadre: data.cadre || '',
        cadre_other: data.cadre_other || '',
        distribution_point: data.distribution_point || '',
        distribution_point_other: data.distribution_point_other || '',
        facility_name: data.facility_name || '',
        implementing_partner: data.implementing_partner || '',
        implementing_partner_other: data.implementing_partner_other || '',
      })
      setWorkDate(data.work_date || '')
      setSavedId(data.id || null)
      setIsPrefill(Boolean(data.is_prefill))
    } catch {
      setError('Unable to load today’s daily details.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  const onChange = (event) => {
    const { name, value } = event.target
    setMessage('')
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'country' && value.trim().toLowerCase() !== 'kenya') {
        // Keep typed county when leaving Kenya list.
      }
      if (name === 'cadre' && value !== 'OTHER') next.cadre_other = ''
      if (name === 'distribution_point' && value !== 'OTHER') {
        next.distribution_point_other = ''
      }
      if (name === 'implementing_partner' && value !== 'OTHER') {
        next.implementing_partner_other = ''
      }
      return next
    })
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { data } = await api.post('/daily-details/today/', form)
      setMessage(data.message || 'Daily details saved.')
      const saved = data.daily_detail
      if (saved) {
        setSavedId(saved.id)
        setWorkDate(saved.work_date || workDate)
        setIsPrefill(false)
        setForm({
          country: saved.country || '',
          county: saved.county || '',
          subcounty: saved.subcounty || '',
          cadre: saved.cadre || '',
          cadre_other: saved.cadre_other || '',
          distribution_point: saved.distribution_point || '',
          distribution_point_other: saved.distribution_point_other || '',
          facility_name: saved.facility_name || '',
          implementing_partner: saved.implementing_partner || '',
          implementing_partner_other: saved.implementing_partner_other || '',
        })
      }
    } catch (err) {
      setError(firstError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <section className="panel daily-details-panel">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Field session</p>
            <h3>Daily details</h3>
            <p className="panel__lede">
              Set where and how you are working today. These details apply to your
              field session for {formatWorkDate(workDate) || 'today'}.
            </p>
          </div>
          <div className="panel__actions">
            {savedId ? (
              <span className="pill pill--soft">Saved for today</span>
            ) : isPrefill ? (
              <span className="pill">Prefill from last session</span>
            ) : (
              <span className="pill">Not saved yet</span>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={loadToday}
              disabled={loading || saving}
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? <div className="alert alert--error">{error}</div> : null}
        {message ? <div className="alert alert--success">{message}</div> : null}

        {loading ? (
          <div className="page-center page-center--compact">
            <div className="loader" />
          </div>
        ) : (
          <form className="auth-form auth-form--grid daily-details-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Country</span>
              <select
                className="select"
                name="country"
                value={form.country}
                onChange={onChange}
                required
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.flag} {country.name}
                  </option>
                ))}
                {!COUNTRIES.some((c) => c.name === form.country) && form.country ? (
                  <option value={form.country}>{form.country}</option>
                ) : null}
              </select>
            </label>

            <label className="field">
              <span>County</span>
              {isKenya ? (
                <select
                  className="select"
                  name="county"
                  value={form.county}
                  onChange={onChange}
                  required
                >
                  <option value="">Select county</option>
                  {countyOptions.map((county) => (
                    <option key={county} value={county}>
                      {county}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="county"
                  value={form.county}
                  onChange={onChange}
                  placeholder="Enter county / region"
                  required
                />
              )}
            </label>

            <label className="field">
              <span>Subcounty</span>
              <input
                name="subcounty"
                value={form.subcounty}
                onChange={onChange}
                placeholder="Enter subcounty"
                required
              />
            </label>

            <label className="field">
              <span>Cadre</span>
              <select
                className="select"
                name="cadre"
                value={form.cadre}
                onChange={onChange}
                required
              >
                <option value="">Select cadre</option>
                {CADRE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.cadre === 'OTHER' ? (
              <label className="field">
                <span>Specify cadre</span>
                <input
                  name="cadre_other"
                  value={form.cadre_other}
                  onChange={onChange}
                  placeholder="Type your cadre"
                  required
                />
              </label>
            ) : null}

            <label className="field auth-form__full">
              <span>Type of distribution point</span>
              <select
                className="select"
                name="distribution_point"
                value={form.distribution_point}
                onChange={onChange}
                required
              >
                <option value="">Select distribution point</option>
                {DISTRIBUTION_POINT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.distribution_point === 'OTHER' ? (
              <label className="field auth-form__full">
                <span>Specify distribution point</span>
                <input
                  name="distribution_point_other"
                  value={form.distribution_point_other}
                  onChange={onChange}
                  placeholder="Type distribution point"
                  required
                />
              </label>
            ) : null}

            <label className="field auth-form__full">
              <span>Name of facility / outreach site</span>
              <input
                name="facility_name"
                value={form.facility_name}
                onChange={onChange}
                placeholder="e.g. Facility or outreach site name"
                required
              />
            </label>

            <label className="field auth-form__full">
              <span>Implementing partner / programme affiliation</span>
              <select
                className="select"
                name="implementing_partner"
                value={form.implementing_partner}
                onChange={onChange}
                required
              >
                <option value="">Select affiliation</option>
                {IMPLEMENTING_PARTNER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.implementing_partner === 'OTHER' ? (
              <label className="field auth-form__full">
                <span>Specify implementing partner</span>
                <input
                  name="implementing_partner_other"
                  value={form.implementing_partner_other}
                  onChange={onChange}
                  placeholder="Type partner / programme name"
                  required
                />
              </label>
            ) : null}

            <div className="auth-form__full daily-details-form__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : savedId ? 'Update daily details' : 'Save daily details'}
              </button>
            </div>
          </form>
        )}
      </section>
    </AppShell>
  )
}
