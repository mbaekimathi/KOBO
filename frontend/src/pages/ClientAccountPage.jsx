import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import AppShell from '../components/AppShell'
import ClientProfileCard from '../components/ClientProfileCard'
import ScreeningDocument from '../components/ScreeningDocument'
import ScreeningFormModal from '../components/ScreeningFormModal'
import { applyAllRules } from '../screening/rules'

export default function ClientAccountPage() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [createdFresh, setCreatedFresh] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [{ data: clientData }, { data: screeningData }] = await Promise.all([
        api.get(`/clients/${id}/`),
        api.post('/screenings/ensure/', { client_id: id }),
      ])
      setClient(clientData)
      setCreatedFresh(Boolean(screeningData.created))
      setForm(
        applyAllRules(
          screeningData.screening?.form || screeningData.screening?.answers || {},
        ),
      )
    } catch {
      setClient(null)
      setForm(null)
      setError('Unable to load this client account.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <AppShell>
      {loading ? (
        <div className="page-center page-center--compact">
          <div className="loader" />
        </div>
      ) : null}

      {error ? (
        <div className="client-account">
          <div className="alert alert--error">{error}</div>
          <Link to="/clients" className="btn btn--ghost btn--small">
            ← Back to my clients
          </Link>
        </div>
      ) : null}

      {!loading && client ? (
        <div className="client-account">
          <div className="profile-panel__toolbar">
            <Link to="/clients" className="btn btn--ghost btn--small">
              ← Back to my clients
            </Link>
          </div>

          <ClientProfileCard client={client} />

          <ScreeningDocument
            form={form}
            onEdit={() => setEditOpen(true)}
            meta={
              createdFresh
                ? 'Auto-filled with defaults and saved.'
                : 'Saved screening results.'
            }
          />
        </div>
      ) : null}

      <ScreeningFormModal
        open={editOpen}
        clientId={id}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false)
          await loadAll()
        }}
      />
    </AppShell>
  )
}
