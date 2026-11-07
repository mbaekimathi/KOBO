import { useEffect, useId, useMemo, useRef, useState } from 'react'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad2(n) {
  return String(n).padStart(2, '0')
}

function parseIso(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return { year: y, month: m - 1, day: d }
}

function toIso(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

function formatDisplay(value) {
  const parsed = parseIso(value)
  if (!parsed) return ''
  return `${pad2(parsed.day)}/${pad2(parsed.month + 1)}/${parsed.year}`
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 3.5v3.2M16 3.5v3.2M3.5 9.5h17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function DateOfBirthPicker({
  value,
  onChange,
  max,
  required = false,
  name = 'date_of_birth',
  id,
}) {
  const autoId = useId()
  const inputId = id || autoId
  const rootRef = useRef(null)
  const yearInputRef = useRef(null)
  const yearListRef = useRef(null)

  const today = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
  }, [])

  const maxDate = useMemo(() => parseIso(max) || today, [max, today])
  const minYear = 1900
  const maxYear = maxDate.year

  const years = useMemo(() => {
    const list = []
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y)
    return list
  }, [maxYear])

  const parsed = parseIso(value)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('year') // year | month | day
  const [draftYear, setDraftYear] = useState(parsed?.year ?? maxYear)
  const [draftMonth, setDraftMonth] = useState(parsed?.month ?? 0)
  const [yearDraft, setYearDraft] = useState(String(parsed?.year ?? maxYear))

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || step !== 'year') return
    yearInputRef.current?.focus()
    yearInputRef.current?.select()
    const selected = yearListRef.current?.querySelector('[data-selected="true"]')
    selected?.scrollIntoView({ block: 'center' })
  }, [open, step])

  const openPicker = () => {
    const nextYear = parsed?.year ?? maxYear
    const nextMonth = parsed?.month ?? 0
    setDraftYear(nextYear)
    setDraftMonth(nextMonth)
    setYearDraft(String(nextYear))
    setStep('year')
    setOpen(true)
  }

  const commitYear = (year) => {
    const clamped = Math.min(maxYear, Math.max(minYear, year))
    setDraftYear(clamped)
    setYearDraft(String(clamped))
    if (clamped === maxYear && draftMonth > maxDate.month) {
      setDraftMonth(maxDate.month)
    }
    setStep('month')
  }

  const onYearInputChange = (event) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 4)
    setYearDraft(next)
  }

  const onYearInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (yearDraft.length === 4) commitYear(Number(yearDraft))
    }
  }

  const onYearInputBlur = () => {
    if (yearDraft.length === 4) {
      const year = Number(yearDraft)
      if (year >= minYear && year <= maxYear) {
        setDraftYear(year)
        setYearDraft(String(year))
      }
    }
  }

  const selectMonth = (month) => {
    if (draftYear === maxYear && month > maxDate.month) return
    setDraftMonth(month)
    setStep('day')
  }

  const selectDay = (day) => {
    if (draftYear === maxYear && draftMonth === maxDate.month && day > maxDate.day) return
    onChange(toIso(draftYear, draftMonth, day))
    setOpen(false)
  }

  const headerLabel =
    step === 'year'
      ? 'Select year'
      : step === 'month'
        ? String(draftYear)
        : `${MONTHS[draftMonth]} ${draftYear}`

  const goBack = () => {
    if (step === 'day') setStep('month')
    else if (step === 'month') setStep('year')
  }

  const dayCells = useMemo(() => {
    const total = daysInMonth(draftYear, draftMonth)
    const firstWeekday = new Date(draftYear, draftMonth, 1).getDay()
    const cells = []
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null)
    for (let d = 1; d <= total; d += 1) cells.push(d)
    return cells
  }, [draftYear, draftMonth])

  return (
    <div className="dob-picker" ref={rootRef}>
      <button
        type="button"
        id={inputId}
        className={`dob-picker__trigger${open ? ' is-open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className={value ? '' : 'dob-picker__placeholder'}>
          {value ? formatDisplay(value) : 'DD/MM/YYYY'}
        </span>
        <span className="dob-picker__icon">
          <CalendarIcon />
        </span>
      </button>

      {/* Validated in the parent form — avoid hidden required inputs (not focusable). */}
      <input type="hidden" name={name} value={value || ''} aria-required={required || undefined} />

      {open ? (
        <div className="dob-picker__panel" role="dialog" aria-label="Date of birth">
          <div className="dob-picker__header">
            {step !== 'year' ? (
              <button type="button" className="dob-picker__nav" onClick={goBack} aria-label="Back">
                ←
              </button>
            ) : (
              <span className="dob-picker__nav-spacer" />
            )}
            <button
              type="button"
              className="dob-picker__title"
              onClick={() => {
                if (step === 'day') setStep('month')
                else if (step === 'month') setStep('year')
              }}
              disabled={step === 'year'}
            >
              {headerLabel}
            </button>
            <span className="dob-picker__nav-spacer" />
          </div>

          {step === 'year' ? (
            <div className="dob-picker__year">
              <label className="dob-picker__year-input-wrap">
                <span className="sr-only">Type year</span>
                <input
                  ref={yearInputRef}
                  className="dob-picker__year-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Type year"
                  value={yearDraft}
                  onChange={onYearInputChange}
                  onKeyDown={onYearInputKeyDown}
                  onBlur={onYearInputBlur}
                  aria-label="Type year"
                />
                <button
                  type="button"
                  className="dob-picker__year-go"
                  disabled={yearDraft.length !== 4}
                  onClick={() => commitYear(Number(yearDraft))}
                >
                  Next
                </button>
              </label>
              <div className="dob-picker__year-list" ref={yearListRef} role="listbox" aria-label="Years">
                {years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    role="option"
                    data-selected={year === draftYear ? 'true' : 'false'}
                    aria-selected={year === draftYear}
                    className={`dob-picker__year-option${year === draftYear ? ' is-selected' : ''}`}
                    onClick={() => commitYear(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 'month' ? (
            <div className="dob-picker__months" role="listbox" aria-label="Months">
              {MONTHS_SHORT.map((label, index) => {
                const disabled = draftYear === maxYear && index > maxDate.month
                return (
                  <button
                    key={label}
                    type="button"
                    role="option"
                    aria-selected={index === draftMonth}
                    disabled={disabled}
                    className={`dob-picker__month-option${index === draftMonth ? ' is-selected' : ''}`}
                    onClick={() => selectMonth(index)}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          ) : null}

          {step === 'day' ? (
            <div className="dob-picker__days">
              <div className="dob-picker__weekdays">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="dob-picker__day-grid" role="listbox" aria-label="Days">
                {dayCells.map((day, index) => {
                  if (day === null) {
                    return <span key={`empty-${index}`} className="dob-picker__day-empty" />
                  }
                  const disabled =
                    draftYear === maxYear && draftMonth === maxDate.month && day > maxDate.day
                  const selected =
                    parsed &&
                    parsed.year === draftYear &&
                    parsed.month === draftMonth &&
                    parsed.day === day
                  return (
                    <button
                      key={day}
                      type="button"
                      role="option"
                      aria-selected={Boolean(selected)}
                      disabled={disabled}
                      className={`dob-picker__day-option${selected ? ' is-selected' : ''}`}
                      onClick={() => selectDay(day)}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
