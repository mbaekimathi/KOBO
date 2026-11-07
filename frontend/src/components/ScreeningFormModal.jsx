import { useEffect, useId, useMemo, useRef, useState } from 'react'
import api from '../api/client'
import {
  CADRE_OPTIONS,
  DIOPTRE_STRENGTHS,
  DISTRIBUTION_POINT_OPTIONS,
  FORM_SCOPE,
  FORM_TITLE,
  GLASSES_NOT_PROVIDED_REASONS,
  HEARD_ABOUT_OPTIONS,
  IMPLEMENTING_PARTNER_OPTIONS,
  NEAR_VA_OPTIONS,
  OCCUPATION_OPTIONS,
  PHONE_TYPE_OPTIONS,
  Q1_OPTIONS,
  REFERRAL_REASON_OPTIONS,
  SECTIONS,
  SEX_OPTIONS,
  SMS_LANGUAGE_OPTIONS,
  DISTANCE_VA_OPTIONS,
  YES_NO,
  AUTO_FIELDS,
} from '../screening/config'
import { applyAllRules, visibility } from '../screening/rules'

const PREFILL_KEYS = new Set([
  'q4_provider_name',
  'q5_cadre',
  'q5b_cadre_other',
  'q6_county',
  'q7_subcounty',
  'q8_distribution_point',
  'q8b_distribution_point_other',
  'q9_facility',
  'q10_implementing_partner',
  'q10b_implementing_partner_other',
  'q13_name',
  'q14_dob',
  'q15_sex',
  'q17_occupation',
  'q17b_occupation_other',
  'q39_phone_number',
])

function FieldShell({ label, hint, auto, prefilled, children, missing }) {
  return (
    <label className={`field screening-field${auto ? ' is-auto' : ''}${missing ? ' is-missing' : ''}`}>
      <span className="screening-field__label">
        {label}
        {auto ? <em className="screening-tag screening-tag--auto">Auto</em> : null}
        {prefilled && !auto ? (
          <em className="screening-tag screening-tag--prefill">Auto-filled, please confirm</em>
        ) : null}
        {missing ? <em className="screening-tag screening-tag--missing">Needs entry</em> : null}
      </span>
      {children}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  )
}

function SelectField({ value, onChange, options, disabled, name }) {
  return (
    <select
      className="select"
      name={name}
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select…</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function MultiCheck({ values, options, onChange, disabled }) {
  const selected = values || []
  return (
    <div className="screening-multi">
      {options.map((opt) => {
        const checked = selected.includes(opt)
        return (
          <label key={opt} className="screening-check">
            <input
              type="checkbox"
              disabled={disabled}
              checked={checked}
              onChange={() => {
                if (checked) onChange(selected.filter((v) => v !== opt))
                else onChange([...selected, opt])
              }}
            />
            <span>{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function ScreeningFormModal({
  clientId,
  open = true,
  onClose,
  onSaved,
  embedded = false,
}) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  const [form, setForm] = useState(null)
  const [screeningId, setScreeningId] = useState(null)
  const [createdFresh, setCreatedFresh] = useState(false)
  const [dirty, setDirty] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [section, setSection] = useState('disclosure')
  const [editing, setEditing] = useState(!embedded)
  const [snapshot, setSnapshot] = useState(null)
  const isActive = Boolean(clientId) && (embedded || open)
  const readOnly = embedded && !editing
  const showAllSections = embedded

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isActive) return undefined

    let cancelled = false
    setLoading(true)
    setError('')
    setSuccess('')
    setDirty(new Set())
    setSection('disclosure')
    setForm(null)
    setScreeningId(null)
    setCreatedFresh(false)
    setEditing(!embedded)
    setSnapshot(null)

    const load = async () => {
      try {
        // Auto-create with defaults if missing; otherwise load saved screening for edit.
        const { data } = await api.post('/screenings/ensure/', { client_id: clientId })
        const screening = data.screening
        if (!cancelled) {
          setScreeningId(screening.id)
          setCreatedFresh(Boolean(data.created))
          const nextForm = applyAllRules(screening.form || screening.answers || {})
          setForm(nextForm)
          setSnapshot(nextForm)
          if (data.created) {
            setSuccess('Defaults auto-filled and saved. Click Edit to make changes.')
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load or create screening.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    if (embedded) {
      return () => {
        cancelled = true
      }
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelled = true
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isActive, clientId, embedded])

  const vis = useMemo(() => (form ? visibility(form) : {}), [form])
  const missing = useMemo(() => new Set(form?.missing_fields || []), [form])

  const setField = (name, value) => {
    if (readOnly) return
    setDirty((prev) => new Set(prev).add(name))
    setForm((prev) => {
      if (!prev) return prev
      const next = { ...prev, [name]: value }
      // Keep client DOB source for AUTO age when consent clears q14
      if (name === 'q14_dob' && value) next._client_dob = value
      return applyAllRules(next)
    })
  }

  const isPrefill = (name) =>
    PREFILL_KEYS.has(name) && !dirty.has(name) && Boolean(form?.[name])

  const startEditing = () => {
    setSnapshot(form)
    setEditing(true)
    setSuccess('')
    setError('')
  }

  const cancelEditing = () => {
    if (snapshot) setForm(applyAllRules(snapshot))
    setDirty(new Set())
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form) return
    if (embedded && !editing) return
    setError('')
    setSuccess('')

    if (vis.end_no_engage) {
      setSuccess('Client did not engage — nothing saved.')
      if (!embedded) window.setTimeout(() => onClose?.(), 900)
      return
    }

    setSaving(true)
    try {
      const { data } = screeningId
        ? await api.patch(`/screenings/${screeningId}/`, { answers: form })
        : await api.post('/screenings/', { client_id: clientId, answers: form })
      setSuccess(data.message || 'Screening updated.')
      if (data.screening?.id) setScreeningId(data.screening.id)
      const savedForm = applyAllRules(data.screening?.form || form)
      setForm(savedForm)
      setSnapshot(savedForm)
      if (embedded) setEditing(false)
      onSaved?.(data.screening)
      if (!embedded) window.setTimeout(() => onClose?.(), 900)
    } catch (err) {
      const payload = err.response?.data
      if (payload && typeof payload === 'object') {
        const key = Object.keys(payload)[0]
        const value = payload[key]
        setError(Array.isArray(value) ? value[0] : String(value || 'Unable to save screening.'))
      } else {
        setError('Unable to save screening.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isActive) return null

  const stock = form?.dioptre_stock || {}
  const dioptreOptions = DIOPTRE_STRENGTHS.filter((d) => stock[d] !== false)

  const sectionVisible = {
    disclosure: true,
    a: vis.section_a,
    b: vis.section_b,
    c: vis.section_c,
    d: vis.section_d,
    e: vis.section_e,
    f: vis.section_f,
  }

  const showSection = (id) => showAllSections || section === id

  const formBody = (
    <>
        <header className={`modal-panel__header${embedded ? ' screening-embedded__header' : ''}`}>
          <div>
            <p className="modal-panel__eyebrow">{FORM_SCOPE}</p>
            <h2 id={titleId}>{FORM_TITLE}</h2>
            <p className="screening-modal__meta">
              {embedded
                ? readOnly
                  ? 'Full form with auto-filled defaults. Click Edit to update.'
                  : 'Editing enabled — update answers, then save.'
                : createdFresh
                  ? 'Auto-filled with defaults and saved — confirm or edit below.'
                  : 'Saved screening for this client — edit and update as needed.'}
            </p>
          </div>
          <div className="screening-header-actions">
            {embedded && readOnly ? (
              <button type="button" className="btn btn--secondary btn--small" onClick={startEditing}>
                Edit
              </button>
            ) : null}
            {!embedded ? (
              <button type="button" className="modal-panel__close" aria-label="Close" onClick={onClose}>
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>
        </header>

        {!showAllSections ? (
          <nav className="screening-progress" aria-label="Form sections">
            {SECTIONS.map((item) => {
              if (!sectionVisible[item.id]) return null
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`screening-progress__item${section === item.id ? ' is-active' : ''}`}
                  onClick={() => setSection(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        ) : null}

        {loading ? (
          <div className="page-center page-center--compact">
            <div className="loader" />
          </div>
        ) : null}

        {error ? <div className="alert alert--error">{error}</div> : null}
        {success ? <div className="alert alert--success">{success}</div> : null}

        {form && !loading ? (
          <form className={`screening-form${showAllSections ? ' screening-form--all' : ''}`} onSubmit={onSubmit}>
            {vis.end_no_engage ? (
              <div className="alert alert--warning">
                Client did not engage. Closing will save nothing.
              </div>
            ) : null}

            {vis.stop_under_35 ? (
              <div className="alert alert--warning">
                Client is under 35. Refer to hospital. An anonymous record can be saved.
              </div>
            ) : null}

            <fieldset className="screening-fieldset" disabled={readOnly}>

            {showSection('disclosure') ? (
              <section className="screening-section">
                <h3>0. Disclosure</h3>
                <FieldShell label="Q1 Part A explained?">
                  <SelectField
                    name="q1_part_a_explained"
                    value={form.q1_part_a_explained}
                    options={Q1_OPTIONS}
                    onChange={(v) => setField('q1_part_a_explained', v)}
                  />
                </FieldShell>
                {vis.form_active ? (
                  <FieldShell label="Q2 Consent to personal details?">
                    <SelectField
                      name="q2_consent_personal"
                      value={form.q2_consent_personal}
                      options={YES_NO}
                      onChange={(v) => setField('q2_consent_personal', v)}
                    />
                  </FieldShell>
                ) : null}
              </section>
            ) : null}

            {showSection('a') && vis.section_a ? (
              <section className="screening-section">
                <h3>A. Service context</h3>
                <FieldShell label="Q3 Date of service" auto>
                  <input value={form.q3_date_of_service || ''} readOnly disabled />
                </FieldShell>
                <FieldShell label="Q4 Provider name" prefilled={isPrefill('q4_provider_name')} missing={missing.has('q4_provider_name')}>
                  <input
                    value={form.q4_provider_name || ''}
                    onChange={(e) => setField('q4_provider_name', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Q5 Cadre" prefilled={isPrefill('q5_cadre')} missing={missing.has('q5_cadre')}>
                  <SelectField
                    value={form.q5_cadre}
                    options={CADRE_OPTIONS}
                    onChange={(v) => setField('q5_cadre', v)}
                  />
                </FieldShell>
                {vis.q5b ? (
                  <FieldShell label="Q5b Specify cadre">
                    <input
                      value={form.q5b_cadre_other || ''}
                      onChange={(e) => setField('q5b_cadre_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q6 County" prefilled={isPrefill('q6_county')} missing={missing.has('q6_county')}>
                  <input
                    value={form.q6_county || ''}
                    onChange={(e) => setField('q6_county', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Q7 Sub-county" prefilled={isPrefill('q7_subcounty')} missing={missing.has('q7_subcounty')}>
                  <input
                    value={form.q7_subcounty || ''}
                    onChange={(e) => setField('q7_subcounty', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Q8 Distribution point type" prefilled={isPrefill('q8_distribution_point')} missing={missing.has('q8_distribution_point')}>
                  <SelectField
                    value={form.q8_distribution_point}
                    options={DISTRIBUTION_POINT_OPTIONS}
                    onChange={(v) => setField('q8_distribution_point', v)}
                  />
                </FieldShell>
                {vis.q8b ? (
                  <FieldShell label="Q8b Specify distribution point">
                    <input
                      value={form.q8b_distribution_point_other || ''}
                      onChange={(e) => setField('q8b_distribution_point_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q9 Facility or outreach site" prefilled={isPrefill('q9_facility')} missing={missing.has('q9_facility')}>
                  <input
                    value={form.q9_facility || ''}
                    onChange={(e) => setField('q9_facility', e.target.value)}
                  />
                </FieldShell>
                <FieldShell
                  label="Q10 Implementing partner"
                  prefilled={isPrefill('q10_implementing_partner')}
                  missing={missing.has('q10_implementing_partner')}
                >
                  <SelectField
                    value={form.q10_implementing_partner}
                    options={IMPLEMENTING_PARTNER_OPTIONS}
                    onChange={(v) => setField('q10_implementing_partner', v)}
                  />
                </FieldShell>
                {vis.q10b ? (
                  <FieldShell label="Q10b Specify partner">
                    <input
                      value={form.q10b_implementing_partner_other || ''}
                      onChange={(e) => setField('q10b_implementing_partner_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
              </section>
            ) : null}

            {showSection('b') && vis.section_b ? (
              <section className="screening-section">
                <h3>B. Client demographics</h3>
                <FieldShell label="Q11 Aged 35+ this year?" auto>
                  <input value={form.q11_aged_35_plus || ''} readOnly disabled />
                </FieldShell>
                <FieldShell label="Q12 Age group" auto>
                  <input value={form.q12_age_group || ''} readOnly disabled />
                </FieldShell>
                {vis.q13 ? (
                  <FieldShell label="Q13 Name" prefilled={isPrefill('q13_name')} missing={missing.has('q13_name')}>
                    <input
                      className="input-uppercase"
                      value={form.q13_name || ''}
                      onChange={(e) => setField('q13_name', e.target.value.toUpperCase())}
                    />
                  </FieldShell>
                ) : null}
                {vis.q14 ? (
                  <FieldShell label="Q14 Date of birth" prefilled={isPrefill('q14_dob')} missing={missing.has('q14_dob')}>
                    <input
                      type="date"
                      value={form.q14_dob || ''}
                      onChange={(e) => setField('q14_dob', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q15 Sex" prefilled={isPrefill('q15_sex')} missing={missing.has('q15_sex')}>
                  <SelectField
                    value={form.q15_sex}
                    options={SEX_OPTIONS}
                    onChange={(v) => setField('q15_sex', v)}
                  />
                </FieldShell>
                {vis.q16 ? (
                  <FieldShell
                    label="Q16 Ward / village"
                    missing={missing.has('q16_ward_village')}
                    hint="Session location is not configured — enter manually."
                  >
                    <input
                      value={form.q16_ward_village || ''}
                      onChange={(e) => setField('q16_ward_village', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q17 ? (
                  <FieldShell label="Q17 Occupation" prefilled={isPrefill('q17_occupation')} missing={missing.has('q17_occupation')}>
                    <SelectField
                      value={form.q17_occupation}
                      options={OCCUPATION_OPTIONS}
                      onChange={(v) => setField('q17_occupation', v)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q17b ? (
                  <FieldShell label="Q17b Specify occupation">
                    <input
                      value={form.q17b_occupation_other || ''}
                      onChange={(e) => setField('q17b_occupation_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
              </section>
            ) : null}

            {showSection('c') && vis.section_c ? (
              <section className="screening-section">
                <h3>C. Clinical screening</h3>
                <FieldShell label="Q18 Wears distance glasses?">
                  <SelectField
                    value={form.q18_wears_distance_glasses}
                    options={YES_NO}
                    onChange={(v) => setField('q18_wears_distance_glasses', v)}
                  />
                </FieldShell>
                <FieldShell label="Q19 Distance VA right eye">
                  <SelectField
                    value={form.q19_distance_va_right}
                    options={DISTANCE_VA_OPTIONS}
                    onChange={(v) => setField('q19_distance_va_right', v)}
                  />
                </FieldShell>
                <FieldShell label="Q20 Distance VA left eye">
                  <SelectField
                    value={form.q20_distance_va_left}
                    options={DISTANCE_VA_OPTIONS}
                    onChange={(v) => setField('q20_distance_va_left', v)}
                  />
                </FieldShell>
                <FieldShell label="Q21 Distance outcome" auto>
                  <input value={form.q21_distance_outcome || ''} readOnly disabled />
                </FieldShell>
                {vis.q22 ? (
                  <FieldShell label="Q22 Reason not tested">
                    <input
                      value={form.q22_reason_not_tested || ''}
                      onChange={(e) => setField('q22_reason_not_tested', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q23 Already owned reading glasses?">
                  <SelectField
                    value={form.q23_owned_reading_glasses}
                    options={YES_NO}
                    onChange={(v) => setField('q23_owned_reading_glasses', v)}
                  />
                </FieldShell>
                {vis.q24 ? (
                  <FieldShell label="Q24 Near VA with own glasses">
                    <SelectField
                      value={form.q24_near_va_own_glasses}
                      options={NEAR_VA_OPTIONS}
                      onChange={(v) => setField('q24_near_va_own_glasses', v)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q25 Own glasses adequate?" auto>
                  <input value={form.q25_own_glasses_adequate || ''} readOnly disabled />
                </FieldShell>
                <FieldShell label="Q26 Near VA unaided">
                  <SelectField
                    value={form.q26_near_va_unaided}
                    options={NEAR_VA_OPTIONS}
                    onChange={(v) => setField('q26_near_va_unaided', v)}
                  />
                </FieldShell>
                <FieldShell label="Q27 Near-vision impairment confirmed?" auto>
                  <input value={form.q27_nvi_confirmed || ''} readOnly disabled />
                </FieldShell>
                <FieldShell label="Q28 Red flags?">
                  <SelectField
                    value={form.q28_red_flags}
                    options={YES_NO}
                    onChange={(v) => setField('q28_red_flags', v)}
                  />
                </FieldShell>
                {vis.q28b ? (
                  <FieldShell label="Q28b Red flag details">
                    <input
                      value={form.q28b_red_flags_detail || ''}
                      onChange={(e) => setField('q28b_red_flags_detail', e.target.value)}
                      required
                    />
                  </FieldShell>
                ) : null}
              </section>
            ) : null}

            {showSection('d') && vis.section_d ? (
              <section className="screening-section">
                <h3>D. Reading glasses</h3>
                <FieldShell label="Q29 Glasses provided?">
                  <SelectField
                    value={form.q29_glasses_provided}
                    options={YES_NO}
                    onChange={(v) => setField('q29_glasses_provided', v)}
                    disabled={form.q28_red_flags === 'Yes'}
                  />
                </FieldShell>
                {vis.q29b ? (
                  <FieldShell label="Q29b Reason not provided">
                    <SelectField
                      value={form.q29b_reason_not_provided}
                      options={GLASSES_NOT_PROVIDED_REASONS}
                      onChange={(v) => setField('q29b_reason_not_provided', v)}
                      disabled={form.q28_red_flags === 'Yes'}
                    />
                  </FieldShell>
                ) : null}
                {vis.q29c ? (
                  <FieldShell label="Q29c Specify reason">
                    <input
                      value={form.q29c_reason_other || ''}
                      onChange={(e) => setField('q29c_reason_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q30 ? (
                  <FieldShell
                    label="Q30 Dioptre strength"
                    hint={
                      (form.flags || []).includes('dioptre_stock_system_missing')
                        ? 'Stock system missing — all strengths enabled.'
                        : ''
                    }
                  >
                    <SelectField
                      value={form.q30_dioptre_strength}
                      options={dioptreOptions}
                      onChange={(v) => setField('q30_dioptre_strength', v)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q31 ? (
                  <FieldShell label="Q31 Near VA with dispensed glasses">
                    <SelectField
                      value={form.q31_near_va_dispensed}
                      options={NEAR_VA_OPTIONS}
                      onChange={(v) => setField('q31_near_va_dispensed', v)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q32 ? (
                  <FieldShell label="Q32 First pair?">
                    <SelectField
                      value={form.q32_first_pair}
                      options={YES_NO}
                      onChange={(v) => setField('q32_first_pair', v)}
                    />
                  </FieldShell>
                ) : null}
              </section>
            ) : null}

            {showSection('e') && vis.section_e ? (
              <section className="screening-section">
                <h3>E. Referral</h3>
                <FieldShell label="Q33 Referred?">
                  <SelectField
                    value={form.q33_referred}
                    options={YES_NO}
                    onChange={(v) => setField('q33_referred', v)}
                  />
                </FieldShell>
                {vis.q34 ? (
                  <FieldShell label="Q34 Referral reasons">
                    <MultiCheck
                      values={form.q34_referral_reasons}
                      options={REFERRAL_REASON_OPTIONS}
                      onChange={(v) => setField('q34_referral_reasons', v)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q34b ? (
                  <FieldShell label="Q34b Specify other reason">
                    <input
                      value={form.q34b_referral_other || ''}
                      onChange={(e) => setField('q34b_referral_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q35 ? (
                  <FieldShell label="Q35 Facility referred to (name + level)">
                    <input
                      value={form.q35_facility_referred_to || ''}
                      onChange={(e) => setField('q35_facility_referred_to', e.target.value)}
                      required
                    />
                  </FieldShell>
                ) : null}
              </section>
            ) : null}

            {showSection('f') && vis.section_f ? (
              <section className="screening-section">
                <h3>F. Demand generation and contact</h3>
                <FieldShell label="Q36 How heard about service">
                  <MultiCheck
                    values={form.q36_how_heard}
                    options={HEARD_ABOUT_OPTIONS}
                    onChange={(v) => setField('q36_how_heard', v)}
                  />
                </FieldShell>
                {vis.q36b ? (
                  <FieldShell label="Q36b Specify other">
                    <input
                      value={form.q36b_how_heard_other || ''}
                      onChange={(e) => setField('q36b_how_heard_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q37 Has mobile phone?">
                  <SelectField
                    value={form.q37_has_mobile_phone}
                    options={PHONE_TYPE_OPTIONS}
                    onChange={(v) => setField('q37_has_mobile_phone', v)}
                  />
                </FieldShell>
                {vis.q38 ? (
                  <FieldShell label="Q38 SMS consent?">
                    <SelectField
                      value={form.q38_sms_consent}
                      options={YES_NO}
                      onChange={(v) => setField('q38_sms_consent', v)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q39 ? (
                  <FieldShell label="Q39 Phone number" prefilled={isPrefill('q39_phone_number')} missing={missing.has('q39_phone_number')}>
                    <input
                      value={form.q39_phone_number || ''}
                      onChange={(e) => setField('q39_phone_number', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q40 ? (
                  <FieldShell label="Q40 SMS language">
                    <SelectField
                      value={form.q40_sms_language}
                      options={SMS_LANGUAGE_OPTIONS}
                      onChange={(v) => setField('q40_sms_language', v)}
                    />
                  </FieldShell>
                ) : null}
                {vis.q40b ? (
                  <FieldShell label="Q40b Specify language">
                    <input
                      value={form.q40b_sms_language_other || ''}
                      onChange={(e) => setField('q40b_sms_language_other', e.target.value)}
                    />
                  </FieldShell>
                ) : null}
                <FieldShell label="Q41 Comments">
                  <textarea
                    rows={3}
                    value={form.q41_comments || ''}
                    onChange={(e) => setField('q41_comments', e.target.value)}
                  />
                </FieldShell>
              </section>
            ) : null}

            </fieldset>

            <div className="modal-panel__actions screening-form__actions">
              {embedded && editing ? (
                <button type="button" className="btn btn--ghost" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </button>
              ) : null}
              {!embedded ? (
                <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
              ) : null}
              {embedded && readOnly ? (
                <button type="button" className="btn btn--secondary" onClick={startEditing}>
                  Edit
                </button>
              ) : (
                <button type="submit" className="btn btn--primary" disabled={saving || loading}>
                  {vis.end_no_engage
                    ? embedded
                      ? 'Dismiss without saving'
                      : 'Close without saving'
                    : saving
                      ? 'Saving…'
                      : 'Update screening'}
                </button>
              )}
            </div>
          </form>
        ) : null}

        {/* silence unused AUTO_FIELDS lint in some setups */}
        <span className="sr-only">{AUTO_FIELDS.length}</span>
    </>
  )

  if (embedded) {
    return (
      <section className="panel screening-embedded" aria-labelledby={titleId}>
        {formBody}
      </section>
    )
  }

  return (
    <div className="modal-root" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close screening form"
        onClick={onClose}
      />
      <div
        className="modal-panel screening-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {formBody}
      </div>
    </div>
  )
}
