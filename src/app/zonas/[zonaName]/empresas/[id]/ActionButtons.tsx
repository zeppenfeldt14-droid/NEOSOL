'use client'

import { completeAccion } from './actions'
import { Check } from 'lucide-react'
import { useTransition } from 'react'

export function CompleteActionButton({ accionId, empresaId }: { accionId: number, empresaId: number }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => completeAccion(accionId, empresaId))}
      disabled={isPending}
      className="btn btn-secondary"
      style={{ padding: '0.25rem', borderRadius: '50%' }}
      title="Marcar como completada"
    >
      <Check size={14} style={{ color: 'var(--success)' }} />
    </button>
  )
}
