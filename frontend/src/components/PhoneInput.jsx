import { useEffect, useRef, useState } from 'react'
import { COUNTRIES } from '../data/countries'

function flagUrl(code) {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`
}

export default function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryChange,
  onPhoneChange,
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = COUNTRIES.find((c) => c.dial === countryCode) || COUNTRIES[0]

  useEffect(() => {
    const onDocClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="phone-input auth-form__full" ref={rootRef}>
      <span className="phone-input__label">Phone number</span>
      <div className="phone-input__row">
        <div className="phone-input__country">
          <button
            type="button"
            className="phone-input__trigger"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <img
              className="phone-input__flag-img"
              src={flagUrl(selected.code)}
              alt=""
              width="24"
              height="18"
            />
            <span className="phone-input__trigger-text">
              <strong>{selected.code}</strong> {selected.name} ({selected.dial})
            </span>
            <span className="phone-input__caret" aria-hidden="true" />
          </button>

          {open ? (
            <ul className="phone-input__menu" role="listbox">
              {COUNTRIES.map((country) => (
                <li key={`${country.code}-${country.dial}`}>
                  <button
                    type="button"
                    className={`phone-input__option ${
                      country.dial === selected.dial ? 'is-selected' : ''
                    }`}
                    role="option"
                    aria-selected={country.dial === selected.dial}
                    onClick={() => {
                      onCountryChange(country.dial)
                      setOpen(false)
                    }}
                  >
                    <img
                      className="phone-input__flag-img"
                      src={flagUrl(country.code)}
                      alt=""
                      width="24"
                      height="18"
                    />
                    <span>
                      <strong>{country.code}</strong> {country.name} ({country.dial})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Keep a hidden input for HTML required validation context */}
          <input type="hidden" name="phone_country_code" value={selected.dial} required={required} />
        </div>

        <label className="phone-input__number field">
          <span className="sr-only">Phone number</span>
          <div className="phone-input__number-wrap">
            <span className="phone-input__dial">{selected.dial}</span>
            <input
              type="tel"
              name="phone_number"
              inputMode="numeric"
              required={required}
              value={phoneNumber}
              onChange={(e) =>
                onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 15))
              }
              placeholder="712345678"
            />
          </div>
        </label>
      </div>
    </div>
  )
}
