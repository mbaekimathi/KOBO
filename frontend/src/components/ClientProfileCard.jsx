function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function clientInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CL'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function ClientProfileCard({ client, onStartScreening }) {
  if (!client) return null

  const sexLabel =
    client.sex_display ||
    (client.sex === 'MALE' ? 'Male' : client.sex === 'FEMALE' ? 'Female' : '—')

  return (
    <section className="profile-panel">
      <div className="profile-panel__hero">
        <div className="profile-panel__photo" aria-hidden="true">
          <span>{clientInitials(client.name)}</span>
        </div>
        <div className="profile-panel__intro">
          <p className="eyebrow">Client account</p>
          <h2>{client.name}</h2>
          <div className="profile-panel__chips">
            <span className="badge badge--soft">{sexLabel}</span>
            <span className="badge badge--success">
              {client.age == null ? 'Age —' : `${client.age} yrs`}
            </span>
            {client.village ? <span className="badge badge--soft">{client.village}</span> : null}
          </div>
          {onStartScreening ? (
            <div className="profile-panel__hero-actions">
              <button type="button" className="btn btn--secondary btn--small" onClick={onStartScreening}>
                {client.has_screening ? 'Edit screening' : 'Start screening'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="detail-list detail-list--cards">
        <div>
          <dt>Full name</dt>
          <dd>{client.name || '—'}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>{formatDate(client.date_of_birth)}</dd>
        </div>
        <div>
          <dt>Age</dt>
          <dd>{client.age == null ? '—' : `${client.age} years`}</dd>
        </div>
        <div>
          <dt>Sex</dt>
          <dd>{sexLabel}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{client.phone_display || '—'}</dd>
        </div>
        <div>
          <dt>Occupation</dt>
          <dd>{client.occupation || '—'}</dd>
        </div>
        <div>
          <dt>Village</dt>
          <dd>{client.village || '—'}</dd>
        </div>
        <div>
          <dt>Dioptre strength provided</dt>
          <dd>{client.dioptre ?? '—'}</dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>{formatDateTime(client.created_at)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(client.updated_at)}</dd>
        </div>
      </dl>
    </section>
  )
}
