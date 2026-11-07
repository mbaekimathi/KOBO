import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import AppShell from '../components/AppShell'

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'IT_SUPPORT', label: 'IT Support' },
  { value: 'DATA_ENTRY', label: 'Data Entry' },
  { value: 'PENDING', label: 'Pending' },
]

function statusTone(status) {
  if (status === 'ACTIVE') return 'badge--success'
  if (status === 'REJECTED') return 'badge--danger'
  return 'badge--warning'
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const stats = useMemo(() => {
    const awaitingVerification = users.filter((u) => !u.is_verified).length
    const awaitingRole = users.filter((u) => u.is_verified && u.role === 'PENDING').length
    return {
      total: users.length,
      awaitingVerification,
      awaitingRole,
      active: users.filter((u) => u.account_status === 'ACTIVE').length,
    }
  }, [users])

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/auth/admin/users/')
      setUsers(data)
    } catch {
      setError('Unable to load employee accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const updateUser = async (id, payload) => {
    setMessage('')
    setError('')
    try {
      const { data } = await api.patch(`/auth/admin/users/${id}/`, payload)
      setMessage(data.message)
      await loadUsers()
    } catch {
      setError('Update failed. Try again.')
    }
  }

  return (
    <AppShell
      title="Admin workspace"
      subtitle="Verify employees and allocate roles across KOBO COLLECT."
    >
      <section className="stats-row">
        <article className="stat">
          <div className="stat__icon stat__icon--teal" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M16 11a3 3 0 1 0-2.83-4H10.8A3 3 0 1 0 8 11v1.2A5 5 0 0 0 4 17v1h16v-1a5 5 0 0 0-4-4.8V11Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <span>Employees</span>
            <strong>{stats.total}</strong>
          </div>
        </article>
        <article className="stat">
          <div className="stat__icon stat__icon--amber" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <span>Awaiting verification</span>
            <strong>{stats.awaitingVerification}</strong>
          </div>
        </article>
        <article className="stat">
          <div className="stat__icon stat__icon--coral" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M7 10h10M7 14h6M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <span>Awaiting role</span>
            <strong>{stats.awaitingRole}</strong>
          </div>
        </article>
      </section>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {message ? <div className="alert alert--success">{message}</div> : null}

      <section className="panel panel--table">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Directory</p>
            <h3>Employee accounts</h3>
          </div>
          <div className="panel__actions">
            <span className="pill pill--soft">{stats.active} active</span>
            <button type="button" className="btn btn--ghost" onClick={loadUsers}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="page-center page-center--compact">
            <div className="loader" />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Employee">
                      <div className="cell-stack">
                        <strong>{u.full_name}</strong>
                        <span>
                          Code {u.login_code} · {u.email}
                        </span>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${statusTone(u.account_status)}`}>
                        {u.account_status_display}
                      </span>
                    </td>
                    <td data-label="Verified">
                      <span
                        className={`badge ${u.is_verified ? 'badge--success' : 'badge--warning'}`}
                      >
                        {u.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td data-label="Role">
                      <select
                        className="select"
                        value={u.role}
                        onChange={(e) =>
                          updateUser(u.id, {
                            role: e.target.value,
                            is_verified:
                              e.target.value === 'PENDING' ? u.is_verified : true,
                          })
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Actions">
                      <div className="action-row">
                        {!u.is_verified ? (
                          <button
                            type="button"
                            className="btn btn--secondary btn--small"
                            onClick={() => updateUser(u.id, { is_verified: true })}
                          >
                            Verify
                          </button>
                        ) : null}
                        {u.account_status !== 'REJECTED' ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() =>
                              updateUser(u.id, {
                                account_status: 'REJECTED',
                                is_verified: false,
                                role: 'PENDING',
                              })
                            }
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length ? (
              <p className="muted empty-state">No employee accounts yet.</p>
            ) : null}
          </div>
        )}
      </section>
    </AppShell>
  )
}
