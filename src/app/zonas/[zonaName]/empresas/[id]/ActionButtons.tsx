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
      className="btn-action rounded-full text-green-400 border-green-400/20 hover:bg-green-400/10"
      title="Marcar como completada"
    >
      <Check size={14} />
    </button>
  )
}
