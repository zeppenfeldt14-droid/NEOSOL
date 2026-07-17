'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { toggleRespuestaObtenida } from './actions'

type Props = {
  visitaId: number
  initialStatus: boolean
  zonaName: string
  empresaId: number
}

export function RespuestaObtenidaButton({ visitaId, initialStatus, zonaName, empresaId }: Props) {
  const [isPending, setIsPending] = useState(false)
  
  const handleToggle = async () => {
    setIsPending(true)
    try {
      await toggleRespuestaObtenida(visitaId, initialStatus, zonaName, empresaId)
    } catch (e) {
      alert('Error al registrar la respuesta')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button 
      onClick={handleToggle}
      disabled={isPending}
      className={`btn ${initialStatus ? 'btn-success' : 'btn-secondary'}`}
      style={{
        padding: '0.2rem 0.6rem',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        borderRadius: '20px',
        opacity: isPending ? 0.6 : 1,
        marginTop: '0.5rem',
        border: initialStatus ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)',
        backgroundColor: initialStatus ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
        color: initialStatus ? '#34d399' : 'rgba(255,255,255,0.6)'
      }}
      title={initialStatus ? "El cliente respondió (Cerrar ciclo)" : "Marcar si hubo respuesta del cliente"}
    >
      <Check size={12} />
      {initialStatus ? 'Respuesta Registrada' : 'Marcar Respuesta'}
    </button>
  )
}
