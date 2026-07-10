'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Filter, Plus, Clock, CheckCircle2,
  XCircle, Globe, Send, AlertCircle
} from 'lucide-react'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface Pedido {
  id: number
  numeroPedido: string
  empresa: { nombre: string }
  zona: string
  vendedorAlias: string
  totalGeneral: number
  condicionPago: string | null
  estado: string
  creadoEn: string
}

const ESTADOS = [
  { key: 'todos',                label: 'Todos',             color: 'text-secondary' },
  { key: 'borrador',             label: 'Borrador',          color: 'text-yellow-400' },
  { key: 'pendiente_supervisor', label: 'Pend. Aprobación',  color: 'text-blue-400' },
  { key: 'aprobado',             label: 'Aprobado',          color: 'text-green-400' },
  { key: 'cancelado',            label: 'Cancelado',         color: 'text-red-400' },
]

const ESTADO_BADGES: Record<string, string> = {
  borrador:              'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  pendiente_supervisor:  'bg-blue-400/10 text-blue-400 border-blue-400/20',
  aprobado:              'bg-green-400/10 text-green-400 border-green-400/20',
  cancelado:             'bg-red-400/10 text-red-400 border-red-400/20',
}
const ESTADO_LABELS: Record<string, string> = {
  borrador:              'Borrador',
  pendiente_supervisor:  'Pend. Aprob.',
  aprobado:              'Aprobado',
  cancelado:             'Cancelado',
}

export function PedidosPageClient({ userNivel, userAlias, userZona, availableZones }: Props) {
  const router = useRouter()
  const [selectedZone, setSelectedZone] = useState<string>(
    userNivel === 3 ? (userZona || '') : 'todas'
  )
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [pedidos, setPedidos]   = useState<Pedido[]>([])
  const [loading, setLoading]   = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const fetchPedidos = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedZone && selectedZone !== 'todas') params.set('zona', selectedZone)
    if (selectedEstado !== 'todos') params.set('estado', selectedEstado)
    const res = await fetch(`/api/pedidos?${params.toString()}`)
    const data = await res.json()
    setPedidos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchPedidos() }, [selectedZone, selectedEstado])

  const handleAction = async (id: number, accion: string) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion }),
      })
      if (res.ok) await fetchPedidos()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Error de conexión') }
    finally { setActionId(null) }
  }

  const counts = {
    todos:                pedidos.length,
    borrador:             pedidos.filter(p => p.estado === 'borrador').length,
    pendiente_supervisor: pedidos.filter(p => p.estado === 'pendiente_supervisor').length,
    aprobado:             pedidos.filter(p => p.estado === 'aprobado').length,
    cancelado:            pedidos.filter(p => p.estado === 'cancelado').length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="text-primary" size={26} />
            Pedidos
          </h1>
          <p className="text-secondary text-sm mt-1">
            {userNivel === 3
              ? `Zona ${userZona} · Mis pedidos`
              : 'Gestión centralizada de pedidos por zona'}
          </p>
        </div>
        <button
          onClick={() => router.push('/pedidos/nuevo')}
          className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 font-bold"
        >
          <Plus size={16} />
          Nuevo Pedido
        </button>
      </div>

      {/* Zone Filter (Level 1 & 2 only) */}
      {userNivel < 3 && (
        <div className="glass-panel card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center border border-white/5">
          <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
            <Globe size={15} />
            <span>Zona:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedZone('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedZone === 'todas'
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                  : 'border-white/10 text-secondary hover:text-white hover:border-white/30'
              }`}
            >
              Todas las Zonas
            </button>
            {availableZones.map(z => (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedZone === z
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'border-white/10 text-secondary hover:text-white hover:border-white/30'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {ESTADOS.map(e => (
          <button
            key={e.key}
            onClick={() => setSelectedEstado(e.key)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              selectedEstado === e.key
                ? 'border-primary text-white bg-white/5'
                : `border-transparent ${e.color} hover:text-white`
            }`}
          >
            {e.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              selectedEstado === e.key ? 'bg-primary/30 text-white' : 'bg-white/5 text-secondary'
            }`}>
              {counts[e.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pedidos',    value: counts.todos,                icon: ShoppingCart, color: 'text-primary',   bg: 'bg-primary/10' },
          { label: 'Pend. Aprobación', value: counts.pendiente_supervisor, icon: Clock,        color: 'text-blue-400',  bg: 'bg-blue-400/10' },
          { label: 'Aprobados',        value: counts.aprobado,             icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Cancelados',       value: counts.cancelado,            icon: XCircle,      color: 'text-red-400',   bg: 'bg-red-400/10' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel card p-4 flex items-center gap-4 border border-white/5">
            <div className={`${kpi.bg} p-3 rounded-xl`}>
              <kpi.icon className={kpi.color} size={20} />
            </div>
            <div>
              <p className="text-secondary text-xs font-semibold">{kpi.label}</p>
              <p className="text-white text-xl font-black">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">Lista de Pedidos</span>
          <div className="flex items-center gap-2 text-secondary text-xs">
            <Filter size={13} />
            <span>
              {selectedZone === 'todas' ? 'Todas las zonas' : `Zona ${selectedZone}`}
              {selectedEstado !== 'todos' ? ` · ${ESTADOS.find(e => e.key === selectedEstado)?.label}` : ''}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Nº Pedido', 'Cliente', 'Zona', 'Vendedor', 'Total', 'Cond. Pago', 'Estado', 'Fecha', 'Acciones'].map(col => (
                  <th key={col} className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando pedidos...</span>
                    </div>
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">No hay pedidos</p>
                      <p className="text-white/30 text-xs">Creá el primer pedido con el botón &ldquo;Nuevo Pedido&rdquo;</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pedidos.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-primary font-black text-xs">{p.numeroPedido}</td>
                    <td className="px-4 py-3 text-white font-semibold text-xs">{p.empresa.nombre}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.zona}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.vendedorAlias}</td>
                    <td className="px-4 py-3 text-white font-black text-xs">{fmt(p.totalGeneral)}</td>
                    <td className="px-4 py-3 text-secondary text-xs">{p.condicionPago || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${ESTADO_BADGES[p.estado] || ''}`}>
                        {ESTADO_LABELS[p.estado] || p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
                      {new Date(p.creadoEn).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {userNivel < 3 && p.estado === 'pendiente_supervisor' && (
                          <button
                            onClick={() => handleAction(p.id, 'aprobar')}
                            disabled={actionId === p.id}
                            className="px-2 py-1 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 text-[10px] font-black border border-green-400/20 transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 size={11} /> Aprobar
                          </button>
                        )}
                        {p.estado === 'borrador' && (
                          <button
                            onClick={() => handleAction(p.id, 'enviar')}
                            disabled={actionId === p.id}
                            className="px-2 py-1 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 text-[10px] font-black border border-blue-400/20 transition-all flex items-center gap-1"
                          >
                            <Send size={11} /> Enviar
                          </button>
                        )}
                        {(p.estado === 'borrador' || (p.estado === 'pendiente_supervisor' && userNivel < 3)) && (
                          <button
                            onClick={() => { if (confirm('¿Cancelar este pedido?')) handleAction(p.id, 'cancelar') }}
                            disabled={actionId === p.id}
                            className="p-1.5 rounded-lg text-secondary hover:text-red-400 hover:bg-red-400/10 transition-all"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
