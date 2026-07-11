'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Phone, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ClientesActivosListProps {
  zonaName: string
}

export function ClientesActivosList({ zonaName }: ClientesActivosListProps) {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch(`/api/empresas/clientes?zona=${zonaName}`)
        if (res.ok) {
          const data = await res.json()
          setClientes(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchClientes()
  }, [zonaName])

  if (loading) {
    return <div className="text-secondary text-sm p-4 text-center">Cargando clientes activos...</div>
  }

  if (clientes.length === 0) {
    return (
      <div className="glass-panel card p-8 text-center flex flex-col items-center gap-3">
        <Building2 size={32} className="text-white/20" />
        <p className="text-secondary text-sm">No hay clientes activos en esta zona.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clientes.map(cliente => (
        <div key={cliente.id} className="glass-panel card p-4 flex flex-col gap-3 border border-white/5 hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 truncate">
              <Building2 size={14} className="text-primary flex-shrink-0" />
              <span className="truncate">{cliente.nombre}</span>
            </h3>
            <span className="badge badge-success shrink-0 text-[10px]">Activo</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-2 text-xs text-secondary">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{cliente.direccion || 'Sin dirección'} {cliente.barrio ? `- ${cliente.barrio}` : ''}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <Phone size={12} className="shrink-0" />
              <span>{cliente.telefono || 'Sin teléfono'}</span>
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-white/10 flex gap-2">
            <Link 
              href={`/zonas/${zonaName}/empresas/${cliente.id}`}
              className="btn btn-secondary flex-1 text-xs flex justify-center items-center gap-1.5"
            >
              <ExternalLink size={12} /> Ver Ficha
            </Link>
            <Link 
              href={`/pedidos/nuevo?empresaId=${cliente.id}`}
              className="btn btn-primary flex-1 text-xs flex justify-center items-center"
            >
              Nuevo Pedido
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
