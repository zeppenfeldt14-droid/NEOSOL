'use client'

import { setEmpresaEstado, descartarEmpresa, eliminarEmpresaDefinitivamente, darDeBajaEmpresa, reactivarCliente } from './quick-actions'
import { CheckCircle2, UserCheck, Printer, Ban, Trash2, ArrowUpCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function QuickActionsClient({ id, estado }: { id: number, estado: string }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  const handleConvertToClient = async () => {
    setIsUpdating(true)
    await setEmpresaEstado(id, 'activo')
    router.refresh()
    setIsUpdating(false)
  }

  const handleConvertToProspect = async () => {
    setIsUpdating(true)
    await setEmpresaEstado(id, 'prospecto')
    router.refresh()
    setIsUpdating(false)
  }

  const handleDescartar = async () => {
    const motivo = prompt('Por favor, ingresa el motivo por el cual se descarta esta empresa:')
    if (!motivo) return // Cancelado o vacío

    setIsUpdating(true)
    await descartarEmpresa(id, motivo)
    router.refresh()
    setIsUpdating(false)
  }

  const handleDarDeBaja = async () => {
    const motivo = prompt('Por favor, ingresa el motivo por el cual se da de baja a este cliente:')
    if (!motivo) return // Cancelado o vacío

    setIsUpdating(true)
    await darDeBajaEmpresa(id, motivo)
    router.refresh()
    setIsUpdating(false)
  }

  const handleReactivar = async () => {
    setIsUpdating(true)
    await reactivarCliente(id)
    router.refresh()
    setIsUpdating(false)
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {estado === 'prospecto' && (
        <>
          <button 
            onClick={handleConvertToClient}
            disabled={isUpdating}
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
          >
            <CheckCircle2 size={16} /> 
            {isUpdating ? 'Actualizando...' : 'Convertir a Cliente'}
          </button>
          <button 
            onClick={handleDescartar}
            disabled={isUpdating}
            className="btn btn-outline border-error text-error hover:bg-error hover:text-white"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
          >
            <Ban size={16} /> 
            {isUpdating ? 'Actualizando...' : 'Descartar'}
          </button>
        </>
      )}
      
      {estado === 'activo' && (
        <>
          <button 
            onClick={handleConvertToProspect}
            disabled={isUpdating}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
          >
            <UserCheck size={16} /> 
            {isUpdating ? 'Actualizando...' : 'Volver a Prospecto'}
          </button>
          <button 
            onClick={handleDarDeBaja}
            disabled={isUpdating}
            className="btn btn-outline border-error text-error hover:bg-error hover:text-white"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
          >
            <Ban size={16} /> 
            {isUpdating ? 'Actualizando...' : 'Dar de Baja'}
          </button>
        </>
      )}

      {estado === 'baja' && (
        <button 
          onClick={handleReactivar}
          disabled={isUpdating}
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
        >
          <ArrowUpCircle size={16} /> 
          {isUpdating ? 'Actualizando...' : 'Reactivar Cliente'}
        </button>
      )}

      {estado === 'descartada' && (
        <button 
          onClick={handleConvertToProspect}
          disabled={isUpdating}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
        >
          <UserCheck size={16} /> 
          {isUpdating ? 'Actualizando...' : 'Recuperar Prospecto'}
        </button>
      )}

      <Link 
        href={`/empresas/${id}/ficha-pdf`} 
        target="_blank"
        className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20"
        style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
      >
        <Printer size={16} /> Ficha Alta PDF
      </Link>

      <button 
        onClick={async () => {
          if (confirm('PELIGRO: ¿Estás totalmente seguro de que deseas ELIMINAR esta empresa y todo su historial de forma permanente?')) {
            setIsUpdating(true)
            await eliminarEmpresaDefinitivamente(id)
            router.push('/empresas')
          }
        }}
        disabled={isUpdating}
        className="btn btn-outline"
        style={{ 
          padding: '0.4rem 0.8rem', 
          borderColor: 'rgba(239, 68, 68, 0.3)', 
          color: 'var(--error)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }}
        title="Eliminar empresa permanentemente"
      >
        <Trash2 size={16} /> Eliminar
      </button>
    </div>
  )
}
