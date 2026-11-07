import { useState } from 'react'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5c-5 0-9.3 3.1-11 7 1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.1 4.5 1.9 5.7l3.2 3.2C3.4 10.1 2.1 11.4 1 12c1.7 3.9 6 7 11 7 1.7 0 3.3-.3 4.8-.9l3.1 3.1 1.2-1.2L3.1 4.5zM12 17c-3.9 0-7.2-2.1-9-5 .7-1.2 1.8-2.4 3.1-3.3l2.1 2.1A5 5 0 0 0 12 17zm0-10c3.9 0 7.2 2.1 9 5-.5.9-1.2 1.8-2.1 2.6l-1.5-1.5c.5-.5.9-1.1 1.1-1.7-1.4-2.2-3.8-3.4-6.5-3.4-.6 0-1.2.1-1.7.2L8.9 6.8C9.9 6.4 10.9 6.2 12 6.2z"
      />
    </svg>
  )
}

export default function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '123456',
  required = true,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </label>
  )
}
