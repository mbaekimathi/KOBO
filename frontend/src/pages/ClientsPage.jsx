import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import AppShell from '../components/AppShell'

function formatPhone(countryCode, number) {
  if (!number) return '—'
  return `${countryCode || ''} ${number}`.trim()
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const loadClients = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/clients/')
      setClients(Array.isArray(data) ? data : data.results || [])
    } catch {
      setError('Unable to load clients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return clients
    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.village,
        client.occupation,
        client.sex,
        client.phone_number,
        String(client.dioptre ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [clients, query])

  const openClient = (id) => {
    navigate(`/clients/${id}`)
  }

  return (
    <AppShell>
      <section className="panel panel--table">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Directory</p>
            <h3>My clients</h3>
          </div>
          <div className="panel__actions">
            <span className="pill pill--soft">{clients.length} total</span>
            <button type="button" className="btn btn--ghost" onClick={loadClients}>
              Refresh
            </button>
          </div>
        </div>

        <div className="clients-toolbar">
          <label className="field clients-toolbar__search">
            <span className="sr-only">Search clients</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, village, phone…"
            />
          </label>
        </div>

        {error ? <div className="alert alert--error">{error}</div> : null}

        {loading ? (
          <div className="page-center page-center--compact">
            <div className="loader" />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table--clickable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age / Sex</th>
                  <th>Phone</th>
                  <th>Village</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="data-table__row-link"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open account for ${client.name}`}
                    onClick={() => openClient(client.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openClient(client.id)
                      }
                    }}
                  >
                    <td data-label="Name">
                      <strong>{client.name}</strong>
                    </td>
                    <td data-label="Age / Sex">
                      {client.age ?? '—'} · {client.sex === 'MALE' ? 'Male' : 'Female'}
                    </td>
                    <td data-label="Phone">
                      {formatPhone(client.phone_country_code, client.phone_number)}
                    </td>
                    <td data-label="Village">{client.village}</td>
                    <td data-label="Account">
                      <span className="clients-open-hint">View profile →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length ? (
              <p className="muted empty-state">
                {clients.length
                  ? 'No clients match your search.'
                  : 'No clients registered yet.'}
              </p>
            ) : null}
          </div>
        )}
      </section>
    </AppShell>
  )
}
