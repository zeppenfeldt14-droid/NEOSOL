'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import CheckoutVisitaModal from '@/components/CheckoutVisitaModal'

export function CompleteActionButton({ accionId, empresaId, empresaNombre = 'Empresa' }: { accionId: number, empresaId: number, empresaNombre?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="btn-action rounded-full text-green-400 border-green-400/20 hover:bg-green-400/10"
        title="Realizar Check-out de Visita"
      >
        <Check size={14} />
      </button>

      {isModalOpen && (
        <CheckoutVisitaModal
          accionId={accionId}
          empresaId={empresaId}
          empresaNombre={empresaNombre}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
