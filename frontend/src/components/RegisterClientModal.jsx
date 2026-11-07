import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { DEFAULT_COUNTRY } from '../data/countries'
import DateOfBirthPicker from './DateOfBirthPicker'
import PhoneInput from './PhoneInput'

const VILLAGE_KEY = 'kobo_last_village'
const OCCUPATION_PRESETS = ['Farmer', 'Retired', 'Formal employment']

const INITIAL = {
  name: '',
  date_of_birth: '',
  sex: '',
  phone_country_code: DEFAULT_COUNTRY.dial,
  phone_number: '',
  occupation: 'Farmer',
  village: '',
  dioptre: '',
}

function calcAge(dob) {
  if (!dob) return null
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

function MaleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="10" cy="14" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.2 9.8 20 4m0 0h-4.4M20 4v4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FemaleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="9" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 14.25V21m-3.1-3.1h6.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function RegisterClientModal({ open, onClose }) {
  const navigate = useNavigate()
  const titleId = useId()
  const firstFieldRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const [form, setForm] = useState(INITIAL)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const age = useMemo(() => calcAge(form.date_of_birth), [form.date_of_birth])
  const occupationIsCustom = form.occupation !== '' && !OCCUPATION_PRESETS.includes(form.occupation)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Reset only when the modal opens — not on every parent re-render (live clock).
  useEffect(() => {
    if (!open) return undefined

    const lastVillage = localStorage.getItem(VILLAGE_KEY) || ''
    setForm({ ...INITIAL, village: lastVillage })
    setError('')
    setSuccess('')
    setSubmitting(false)

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const onChange = (event) => {
    const { name, value } = event.target

    if (name === 'name') {
      setForm((prev) => ({ ...prev, name: value.toUpperCase() }))
      return
    }

    if (name === 'dioptre') {
      const cleaned = value.replace(/[^\d.-]/g, '')
      const parts = cleaned.split('.')
      const normalized =
        parts.length <= 1
          ? cleaned.replace(/(?!^)-/g, '')
          : `${parts[0].replace(/(?!^)-/g, '')}.${parts.slice(1).join('').replace(/-/g, '')}`
      setForm((prev) => ({ ...prev, dioptre: normalized }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) {
      setError('Enter the client name.')
      return
    }
    if (!form.date_of_birth) {
      setError('Select a date of birth.')
      return
    }
    if (age === null) {
      setError('Enter a valid date of birth.')
      return
    }
    if (!form.sex) {
      setError('Select male or female.')
      return
    }
    if (!form.phone_number || form.phone_number.length < 7) {
      setError('Enter a valid phone number.')
      return
    }
    if (!form.occupation.trim()) {
      setError('Enter or select an occupation.')
      return
    }
    if (!form.village.trim()) {
      setError('Enter the village.')
      return
    }
    if (form.dioptre === '' || Number.isNaN(Number(form.dioptre))) {
      setError('Enter the dioptre strength provided.')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/clients/', {
        name: form.name.trim().toUpperCase(),
        date_of_birth: form.date_of_birth,
        sex: form.sex,
        phone_country_code: form.phone_country_code,
        phone_number: form.phone_number,
        occupation: form.occupation.trim(),
        village: form.village.trim(),
        dioptre: form.dioptre,
      })

      const savedVillage = form.village.trim()
      localStorage.setItem(VILLAGE_KEY, savedVillage)

      // Prefill + save screening defaults in the background for later editing.
      if (data.client?.id) {
        try {
          await api.post('/screenings/ensure/', { client_id: data.client.id })
        } catch {
          /* registration still succeeds even if screening prefill fails */
        }
      }

      onClose?.()
      navigate('/clients')
    } catch (err) {
      const payload = err.response?.data
      if (payload && typeof payload === 'object') {
        const firstKey = Object.keys(payload).find((key) => key !== 'message') || 'message'
        const value = payload[firstKey]
        setError(Array.isArray(value) ? value[0] : String(value || 'Unable to register client.'))
      } else {
        setError('Unable to register client. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-root" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close register client"
        onClick={onClose}
      />
      <div
        className="modal-panel register-client-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-panel__header">
          <div>
            <p className="modal-panel__eyebrow">Field registration</p>
            <h2 id={titleId}>Register client</h2>
          </div>
          <button type="button" className="modal-panel__close" aria-label="Close" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <form className="auth-form auth-form--grid register-client-form" onSubmit={onSubmit}>
          <label className="field auth-form__full">
            <span>Name</span>
            <input
              ref={firstFieldRef}
              name="name"
              className="input-uppercase"
              value={form.name}
              onChange={onChange}
              placeholder="FULL NAME"
              autoComplete="name"
              required
            />
          </label>

          <div className="field">
            <span>Date of birth</span>
            <DateOfBirthPicker
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={(next) => setForm((prev) => ({ ...prev, date_of_birth: next }))}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div className="field">
            <span>Age</span>
            <div className="age-pill" aria-live="polite">
              {age === null ? '—' : `${age} year${age === 1 ? '' : 's'}`}
            </div>
          </div>

          <fieldset className="sex-field auth-form__full">
            <legend>Sex</legend>
            <div className="sex-field__options" role="radiogroup" aria-label="Sex">
              <button
                type="button"
                className={`sex-option${form.sex === 'MALE' ? ' is-selected' : ''}`}
                aria-pressed={form.sex === 'MALE'}
                onClick={() => setForm((prev) => ({ ...prev, sex: 'MALE' }))}
              >
                <span className="sex-option__icon sex-option__icon--male">
                  <MaleIcon />
                </span>
                <span>Male</span>
              </button>
              <button
                type="button"
                className={`sex-option${form.sex === 'FEMALE' ? ' is-selected' : ''}`}
                aria-pressed={form.sex === 'FEMALE'}
                onClick={() => setForm((prev) => ({ ...prev, sex: 'FEMALE' }))}
              >
                <span className="sex-option__icon sex-option__icon--female">
                  <FemaleIcon />
                </span>
                <span>Female</span>
              </button>
            </div>
          </fieldset>

          <PhoneInput
            countryCode={form.phone_country_code}
            phoneNumber={form.phone_number}
            onCountryChange={(dial) =>
              setForm((prev) => ({ ...prev, phone_country_code: dial }))
            }
            onPhoneChange={(value) => setForm((prev) => ({ ...prev, phone_number: value }))}
            required
          />

          <div className="field auth-form__full">
            <span>Occupation</span>
            <div className="chip-row" role="group" aria-label="Occupation presets">
              {OCCUPATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`chip${form.occupation === preset ? ' is-selected' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, occupation: preset }))}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              name="occupation"
              value={form.occupation}
              onChange={onChange}
              placeholder="Or type another occupation"
              required
            />
            {occupationIsCustom ? (
              <small className="field-hint">Custom occupation will be saved as entered.</small>
            ) : null}
          </div>

          <label className="field">
            <span>Village</span>
            <input
              name="village"
              value={form.village}
              onChange={onChange}
              placeholder="Village name"
              required
            />
          </label>

          <label className="field">
            <span>Dioptre strength provided</span>
            <input
              name="dioptre"
              inputMode="decimal"
              value={form.dioptre}
              onChange={onChange}
              placeholder="e.g. -1.75"
              required
            />
          </label>

          {error ? <p className="alert alert--error auth-form__full">{error}</p> : null}
          {success ? <p className="alert alert--success auth-form__full">{success}</p> : null}

          <div className="modal-panel__actions auth-form__full">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Register client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
