import { useEffect, useId, useRef, useState } from 'react'
import api from '../api/client'
import ClientProfileCard from './ClientProfileCard'
import ScreeningFormModal from './ScreeningFormModal'

export default function ClientAccountModal({ clientId, open, onClose }) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [screeningOpen, setScreeningOpen] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open || !clientId) return undefined

    let cancelled = false
    setLoading(true)
    setError('')
    setClient(null)
    setScreeningOpen(false)

    const load = async () => {
      try {
        const { data } = await api.get(`/clients/${clientId}/`)
        if (!cancelled) setClient(data)
      } catch {
        if (!cancelled) setError('Unable to load this client account.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

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
  }, [open, clientId])

  if (!open) return null

  return (
    <div className="modal-root" role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close client account"
        onClick={onClose}
      />
      <div
        className="modal-panel client-account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-panel__header">
          <div>
            <p className="modal-panel__eyebrow">Directory</p>
            <h2 id={titleId}>{client?.name || 'Client account'}</h2>
          </div>
          <button type="button" className="modal-panel__close" aria-label="Close" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {loading ? (
          <div className="page-center page-center--compact">
            <div className="loader" />
          </div>
        ) : null}

        {error ? <div className="alert alert--error">{error}</div> : null}

        {!loading && client ? (
          <ClientProfileCard
            client={client}
            onStartScreening={() => setScreeningOpen(true)}
          />
        ) : null}
      </div>

      <ScreeningFormModal
        open={screeningOpen}
        clientId={clientId}
        onClose={() => setScreeningOpen(false)}
        onSaved={async () => {
          try {
            const { data } = await api.get(`/clients/${clientId}/`)
            setClient(data)
          } catch {
            /* keep current client card */
          }
        }}
      />
    </div>
  )
}
