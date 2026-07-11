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
            className="btn btn-primary text-xs px-3"
          >
            <CheckCircle2 size={16} /> 
            {isUpdating ? 'Actualizando...' : 'Convertir a Cliente'}
          </button>
          <button 
            onClick={handleDescartar}
            disabled={isUpdating}
            className="btn btn-action text-red-500 border-red-500/20 hover:bg-red-500/10 px-3 text-xs font-bold"
          >
            <Ban size={16} /> 
            {isUpdating ? 'Actualizando...' : 'Descartar'}
          </button>
        </>
      )}
      
      {estado === 'activo' && (
        <button 
          onClick={handleConvertToProspect}
          disabled={isUpdating}
          className="btn btn-secondary text-xs px-3"
        >
          <UserCheck size={16} /> 
          {isUpdating ? 'Actualizando...' : 'Volver a Prospecto'}
        </button>
      )}

      {estado === 'descartada' && (
        <button 
          onClick={handleConvertToProspect}
          disabled={isUpdating}
          className="btn btn-secondary text-xs px-3"
        >
          <UserCheck size={16} /> 
          {isUpdating ? 'Actualizando...' : 'Recuperar Prospecto'}
        </button>
      )}

      {estado !== 'baja' && (
        <button 
          onClick={handleDarDeBaja}
          disabled={isUpdating}
          className="btn btn-action text-red-500 border-red-500/20 hover:bg-red-500/10 px-3 text-xs font-bold"
        >
          <Ban size={16} /> 
          {isUpdating ? 'Actualizando...' : 'Dar de Baja'}
        </button>
      )}

      {estado === 'baja' && (
        <button 
          onClick={handleReactivar}
          disabled={isUpdating}
          className="btn btn-primary text-xs px-3"
        >
          <ArrowUpCircle size={16} /> 
          {isUpdating ? 'Actualizando...' : 'Reactivar Cliente'}
        </button>
      )}

      <Link 
        href={`/empresas/${id}/ficha-pdf`} 
        target="_blank"
        className="btn btn-secondary text-xs px-3"
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
        className="btn btn-action text-red-500 border-red-500/20 hover:bg-red-500/10 px-3 text-xs font-bold"
        title="Eliminar empresa permanentemente"
      >
        <Trash2 size={16} /> Eliminar
      </button>
    </div>
  )
}
