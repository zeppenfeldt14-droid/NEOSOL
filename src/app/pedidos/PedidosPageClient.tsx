'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Filter, Plus, Clock, CheckCircle2,
  XCircle, Globe, Send, AlertCircle, Eye, Edit3, Calendar,
  Info, FileText, Check, DollarSign, Gift, User, Package, Calculator,
  Trash2, Download
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface PedidoDetalle {
  id: number
  productoNombre: string
  producto: { codigoInterno: string; paqPorCaja: number }
  precioCajaSnapshot: number
  precioCajaOriginal: number
  cantidadCajas: number
  subtotal: number
  cajasBonus: number
  descripcionBonus: string | null
}

interface Pedido {
  id: number
  numeroPedido: string
  empresa: { nombre: string; cuit: string | null }
  zona: string
  vendedorAlias: string
  totalGeneral: number
  condicionPago: string | null
  estado: string
  tienePrecioNegociado: boolean
  tieneTarifaNegociada: boolean
  creadoEn: string
  porcentajePagoA: number
  porcentajePagoB: number
  aplicaFinanciera: boolean
  plazosPago: string | null
  observaciones: string | null
  acuerdosComerciales: string | null
  requierePresupuesto: boolean
  turnoEntrega: string | null
  fechaEntrega: string | null
  subtotalSinIVA: number
  montoIVA: number
  montoFinanciera: number
  aprobadoPorAlias: string | null
  aprobadoEn: string | null
  detalles: PedidoDetalle[]
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
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [pedidoAprobar, setPedidoAprobar] = useState<Pedido | null>(null)
  const [fechaEntrega, setFechaEntrega] = useState('')

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

  const handleAction = async (id: number, accion: string, customData?: any) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...customData }),
      })
      if (res.ok) await fetchPedidos()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Error de conexión') }
    finally { setActionId(null) }
  }

  const handleDelete = async (id: number) => {
    setActionId(id)
    try {
      const res = await fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
      if (res.ok) await fetchPedidos()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Error de conexión') }
    finally { setActionId(null) }
  }

  const handlePrintPedido = async (p: Pedido) => {
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const div = document.createElement('div')
    div.innerHTML = `
      <div style="font-family: 'Helvetica Neue', sans-serif; font-size: 11px; padding: 20px; color: #222; background: white; width: 800px;">
        <div style="border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 20px; font-weight: 900; color: #444;">NEOSOL</div>
            <p><strong>Pedido:</strong> ${p.numeroPedido}</p>
            <p><strong>Cliente:</strong> ${p.empresa.nombre} ${p.empresa.cuit ? `(CUIT: ${p.empresa.cuit})` : ''}</p>
            <p><strong>Vendedor:</strong> ${p.vendedorAlias} | <strong>Zona:</strong> ${p.zona}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Fecha:</strong> ${new Date(p.creadoEn).toLocaleString('es-AR')}</p>
            <p><strong>Estado:</strong> ${ESTADO_LABELS[p.estado] || p.estado}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Cód</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Producto</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Paq/Caja</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Cajas</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Bonus</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Precio Caja</th>
              <th style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right; background: #f9f9f9; font-size: 10px; text-transform: uppercase;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${p.detalles.map(d => `
              <tr>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left;">${d.producto.codigoInterno}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left;">${d.productoNombre}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.producto.paqPorCaja}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.cantidadCajas}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: center;">${d.cajasBonus ? `+${d.cajasBonus}` : '-'}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right;">${fmt(d.precioCajaSnapshot)}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: right;">${fmt(d.subtotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <table style="width: 300px; border-collapse: collapse;">
            <tr><td style="padding: 4px; text-align: left;">Subtotal Neto:</td><td style="padding: 4px; text-align: right;">${fmt(p.subtotalSinIVA)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;">IVA (21%):</td><td style="padding: 4px; text-align: right;">${fmt(p.montoIVA)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;">Recargo Financiación:</td><td style="padding: 4px; text-align: right;">${fmt(p.montoFinanciera)}</td></tr>
            <tr><td style="padding: 4px; text-align: left;"><h3>Total General:</h3></td><td style="padding: 4px; text-align: right;"><h3>${fmt(p.totalGeneral)}</h3></td></tr>
          </table>
        </div>
        <div style="margin-top: 30px; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
          ${p.observaciones ? `<p><strong>Observaciones:</strong> ${p.observaciones}</p>` : ''}
          <p>Condición de Pago: ${p.condicionPago || 'N/A'}</p>
          <p>Generado el ${today}</p>
        </div>
      </div>
    `
    div.style.position = 'absolute'
    div.style.top = '-9999px'
    div.style.left = '-9999px'
    document.body.appendChild(div)

    try {
      const canvas = await html2canvas(div.firstElementChild as HTMLElement, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Pedido_${p.numeroPedido}.pdf`)
    } finally {
      document.body.removeChild(div)
    }
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

      {/* Zone & Status Filters (50/50 Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zone Filter */}
        {userNivel < 3 ? (
          <div className="glass-panel card p-4 flex flex-col gap-3 border border-white/5">
            <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
              <Globe size={15} />
              <span>Zona:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedZone('todas')}
                className={`btn-toggle ${selectedZone === 'todas' ? 'active' : ''}`}
              >
                Todas las Zonas
              </button>
              {availableZones.map(z => (
                <button
                  key={z}
                  onClick={() => setSelectedZone(z)}
                  className={`btn-toggle ${selectedZone === z ? 'active' : ''}`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        ) : <div />}

        {/* Status Filter */}
        <div className="glass-panel card p-4 flex flex-col gap-3 border border-white/5">
          <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
            <CheckCircle2 size={15} />
            <span>Estado:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map(e => (
              <button
                key={e.key}
                onClick={() => setSelectedEstado(e.key)}
                className={`btn-toggle ${selectedEstado === e.key ? 'active' : ''} flex items-center gap-1`}
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
        </div>
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
                    <td className="px-4 py-3 text-primary font-black text-xs">
                      {p.numeroPedido}
                      {p.tienePrecioNegociado && (
                        <span className="block text-[8px] text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
                          ⚠️ Precio Negociado
                        </span>
                      )}
                      {p.tieneTarifaNegociada && (
                        <span className="block text-[8px] text-yellow-400 font-bold uppercase tracking-wider mt-0.5">
                          ⚠️ Tarifa Negociada
                        </span>
                      )}
                    </td>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Ver detalles */}
                        <button
                          onClick={() => setSelectedPedido(p)}
                          className="btn-action"
                          title="Ver detalles"
                        >
                          <Eye size={12} />
                        </button>

                        {/* Editar borrador */}
                        {p.estado === 'borrador' && (
                          <button
                            onClick={() => router.push(`/pedidos/nuevo?edit=${p.id}`)}
                            className="btn-action text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/10"
                            title="Editar pedido"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}

                        {/* Aprobar */}
                        {userNivel < 3 && p.estado === 'pendiente_supervisor' && (
                          <button
                            onClick={() => {
                              const requiresNivel1 = p.tienePrecioNegociado || p.tieneTarifaNegociada || (p.porcentajePagoB > 0)
                              if (requiresNivel1 && userNivel === 2) {
                                alert('Este pedido contiene precios/tarifas negociadas o pago Parte B, y requiere aprobación de Gerencia (Nivel 1).');
                                return;
                              }
                              setPedidoAprobar(p)
                              setFechaEntrega('')
                            }}
                            disabled={actionId === p.id}
                            className={`btn-action text-[10px] uppercase font-black tracking-wider ${
                              (p.tienePrecioNegociado || p.tieneTarifaNegociada || (p.porcentajePagoB > 0)) && userNivel === 2
                                ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                                : 'text-green-400 border-green-400/20 hover:bg-green-400/10'
                            }`}
                            title={(p.tienePrecioNegociado || p.tieneTarifaNegociada || (p.porcentajePagoB > 0)) && userNivel === 2 ? 'Requiere aprobación de Gerencia (Nivel 1)' : 'Aprobar pedido'}
                          >
                            <CheckCircle2 size={11} /> {(p.tienePrecioNegociado || p.tieneTarifaNegociada || (p.porcentajePagoB > 0)) && userNivel === 2 ? 'Bloqueado' : 'Aprobar'}
                          </button>
                        )}

                        {/* Enviar */}
                        {p.estado === 'borrador' && (
                          <button
                            onClick={() => handleAction(p.id, 'enviar')}
                            disabled={actionId === p.id}
                            className="btn-action text-[10px] uppercase font-black tracking-wider text-blue-400 border-blue-400/20 hover:bg-blue-400/10"
                            title="Enviar al Supervisor"
                          >
                            <Send size={11} /> Enviar
                          </button>
                        )}

                        {/* Cancelar */}
                        {(p.estado === 'borrador' || (p.estado === 'pendiente_supervisor' && userNivel < 3)) && (
                          <button
                            onClick={() => { if (confirm('¿Cancelar este pedido?')) handleAction(p.id, 'cancelar') }}
                            disabled={actionId === p.id}
                            className="btn-action text-orange-400 border-orange-400/20 hover:bg-orange-400/10"
                            title="Cancelar pedido"
                          >
                            <XCircle size={12} />
                          </button>
                        )}

                        {/* Borrar (Delete) */}
                        {((p.estado === 'borrador' || p.estado === 'cancelado') || userNivel < 3) && (
                          <button
                            onClick={() => { if (confirm('¿ELIMINAR DEFINITIVAMENTE este pedido del sistema? Esta acción no se puede deshacer.')) handleDelete(p.id) }}
                            disabled={actionId === p.id}
                            className="btn-action text-red-500 border-red-500/20 hover:bg-red-500/10"
                            title="Eliminar pedido definitivamente"
                          >
                            <Trash2 size={12} />
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

      {/* ── Modal: Detalle de Pedido ───────────────────────────────── */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-white/10 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingCart className="text-primary" size={20} />
                <h3 className="text-white font-bold text-lg">Pedido {selectedPedido.numeroPedido}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${ESTADO_BADGES[selectedPedido.estado] || ''}`}>
                  {ESTADO_LABELS[selectedPedido.estado] || selectedPedido.estado}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintPedido(selectedPedido)}
                  className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold"
                >
                  <Download size={14} />
                  Descargar
                </button>
                <button
                  onClick={() => setSelectedPedido(null)}
                  className="btn-action ml-2 w-8 h-8"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col gap-6 overflow-y-auto">
              {/* Info General */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-secondary block mb-1">Cliente</span>
                  <strong className="text-white text-sm">{selectedPedido.empresa.nombre}</strong>
                  {selectedPedido.empresa.cuit && <span className="block text-[10px] text-white/50 mt-0.5">CUIT: {selectedPedido.empresa.cuit}</span>}
                </div>
                <div>
                  <span className="text-secondary block mb-1">Zona</span>
                  <strong className="text-white text-sm uppercase">{selectedPedido.zona}</strong>
                </div>
                <div>
                  <span className="text-secondary block mb-1">Vendedor</span>
                  <strong className="text-white text-sm">{selectedPedido.vendedorAlias}</strong>
                </div>
                <div>
                  <span className="text-secondary block mb-1">Fecha de Creación</span>
                  <strong className="text-white text-sm">{new Date(selectedPedido.creadoEn).toLocaleDateString('es-AR')} {new Date(selectedPedido.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
              </div>

              {/* Detalles de Productos */}
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package size={14} className="text-primary" /> Productos del Pedido
                </h4>
                <div className="border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black text-secondary uppercase tracking-widest">
                        <th className="px-4 py-2">Cód</th>
                        <th className="px-4 py-2">Producto</th>
                        <th className="px-4 py-2 text-center">Paq/Caja</th>
                        <th className="px-4 py-2 text-right">Precio Caja</th>
                        <th className="px-4 py-2 text-center">Cantidad</th>
                        <th className="px-4 py-2 text-center">Bonus</th>
                        <th className="px-4 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPedido.detalles.map(d => {
                        const isCustom = Math.abs(d.precioCajaSnapshot - d.precioCajaOriginal) > 0.01
                        return (
                          <tr key={d.id} className="border-b border-white/5 text-white/90">
                            <td className="px-4 py-3 text-primary font-bold">{d.producto?.codigoInterno || '—'}</td>
                            <td className="px-4 py-3 font-semibold">{d.productoNombre}</td>
                            <td className="px-4 py-3 text-center text-secondary">{d.producto?.paqPorCaja || '—'}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {fmt(d.precioCajaSnapshot)}
                              {isCustom && <span className="block text-[8px] text-yellow-400 font-bold">Negociado</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-white">{d.cantidadCajas}</td>
                            <td className="px-4 py-3 text-center">
                              {d.cajasBonus > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black" title={d.descripcionBonus || ''}>
                                  +{d.cajasBonus} reg
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-white">{fmt(d.subtotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Negociación & Logística */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <FileText size={14} className="text-secondary" /> Condiciones de Venta
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-secondary block mb-0.5">Condición de Pago</span>
                      <strong className="text-white">{selectedPedido.condicionPago || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block mb-0.5">Recargo Financiera (3%)</span>
                      <strong className={selectedPedido.aplicaFinanciera ? 'text-primary font-black' : 'text-white/40'}>
                        {selectedPedido.aplicaFinanciera ? 'SÍ' : 'NO'}
                      </strong>
                    </div>
                    {selectedPedido.plazosPago && (
                      <div className="col-span-2">
                        <span className="text-secondary block mb-0.5">Plazos Especiales</span>
                        <strong className="text-white">{selectedPedido.plazosPago}</strong>
                      </div>
                    )}
                    {selectedPedido.acuerdosComerciales && (
                      <div className="col-span-2">
                        <span className="text-secondary block mb-0.5">Acuerdos Comerciales</span>
                        <strong className="text-yellow-400 font-semibold">{selectedPedido.acuerdosComerciales}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col gap-3">
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <Globe size={14} className="text-secondary" /> Logística e Indicadores
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-secondary block mb-0.5">Requiere Presupuesto</span>
                      <strong className="text-white">{selectedPedido.requierePresupuesto ? 'SÍ' : 'NO'}</strong>
                    </div>
                    <div>
                      <span className="text-secondary block mb-0.5">Turno de Entrega</span>
                      <strong className="text-white">{selectedPedido.turnoEntrega || '—'}</strong>
                    </div>
                    {selectedPedido.fechaEntrega && (
                      <div className="col-span-2">
                        <span className="text-secondary block mb-0.5">Día de Entrega Acordado</span>
                        <strong className="text-green-400 flex items-center gap-1 font-bold text-sm bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg w-max mt-1">
                          <Calendar size={13} />
                          {new Date(selectedPedido.fechaEntrega).toLocaleDateString('es-AR')}
                        </strong>
                      </div>
                    )}
                    {selectedPedido.observaciones && (
                      <div className="col-span-2">
                        <span className="text-secondary block mb-0.5">Observaciones</span>
                        <strong className="text-white font-normal">{selectedPedido.observaciones}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totales y Facturación Split */}
              <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex flex-col gap-4">
                <h4 className="text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-primary/20 pb-2">
                  <Calculator size={14} className="text-primary" /> Liquidación e Impuestos
                </h4>
                
                {/* Resumen Totales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-primary/10 pb-4">
                  <div>
                    <span className="text-secondary block mb-0.5">Subtotal Neto</span>
                    <strong className="text-white text-sm">{fmt(selectedPedido.subtotalSinIVA)}</strong>
                  </div>
                  <div>
                    <span className="text-secondary block mb-0.5">IVA Parte A (21%)</span>
                    <strong className="text-white text-sm">{fmt(selectedPedido.montoIVA)}</strong>
                  </div>
                  <div>
                    <span className="text-secondary block mb-0.5">Recargo Financiera</span>
                    <strong className="text-white text-sm">{fmt(selectedPedido.montoFinanciera)}</strong>
                  </div>
                  <div>
                    <span className="text-secondary block mb-0.5">Total General</span>
                    <strong className="text-primary text-base font-black">{fmt(selectedPedido.totalGeneral)}</strong>
                  </div>
                </div>

                {/* Split Factura A y B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  {/* Factura A */}
                  <div className="bg-black/30 border border-white/5 p-3 rounded-lg flex flex-col gap-1.5">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <FileText size={12} className="text-blue-400" /> Factura A (Con IVA) — Cuenta por Cobrar
                    </span>
                    <div className="flex items-center justify-between text-secondary">
                      <span>Porcentaje:</span>
                      <span className="text-white font-semibold">{selectedPedido.porcentajePagoA}%</span>
                    </div>
                    <div className="flex items-center justify-between text-secondary">
                      <span>Total A (Con IVA):</span>
                      <strong className="text-blue-400 font-bold">
                        {fmt(
                          (selectedPedido.subtotalSinIVA * (selectedPedido.porcentajePagoA / 100)) +
                          selectedPedido.montoIVA +
                          (selectedPedido.aplicaFinanciera ? ((selectedPedido.subtotalSinIVA * (selectedPedido.porcentajePagoA / 100)) + selectedPedido.montoIVA) * 0.03 : 0)
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Factura B */}
                  <div className="bg-black/30 border border-white/5 p-3 rounded-lg flex flex-col gap-1.5">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <FileText size={12} className="text-yellow-400" /> Factura B / Remito (Sin IVA) — Aprob. Nivel 1
                    </span>
                    <div className="flex items-center justify-between text-secondary">
                      <span>Porcentaje:</span>
                      <span className="text-white font-semibold">{selectedPedido.porcentajePagoB}%</span>
                    </div>
                    <div className="flex items-center justify-between text-secondary">
                      <span>Total B (Sin IVA):</span>
                      <strong className="text-yellow-400 font-bold">
                        {fmt(
                          (selectedPedido.subtotalSinIVA * (selectedPedido.porcentajePagoB / 100)) +
                          (selectedPedido.aplicaFinanciera ? (selectedPedido.subtotalSinIVA * (selectedPedido.porcentajePagoB / 100)) * 0.03 : 0)
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auditoría */}
              {selectedPedido.aprobadoPorAlias && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
                  <User size={13} />
                  Aprobado por: <strong>{selectedPedido.aprobadoPorAlias}</strong> el <strong>{selectedPedido.aprobadoEn ? new Date(selectedPedido.aprobadoEn).toLocaleDateString('es-AR') : '—'}</strong>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedPedido(null)}
                className="btn btn-secondary text-xs"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Selector de Fecha de Entrega ────────────────────────── */}
      {pedidoAprobar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-white/10 rounded-2xl max-w-md w-full flex flex-col shadow-2xl max-h-[90vh]">
            <div className="p-6 border-b border-white/5 shrink-0">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                Día de Entrega del Pedido
              </h3>
              <p className="text-secondary text-xs mt-1">
                Indicá la fecha estimada de entrega para el pedido <strong>{pedidoAprobar.numeroPedido}</strong>. El vendedor será notificado.
              </p>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto">
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Fecha de Entrega</label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={e => setFechaEntrega(e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm mt-1 w-full text-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2 shrink-0">
              <button
                onClick={() => {
                  setPedidoAprobar(null)
                  setFechaEntrega('')
                }}
                className="btn btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!fechaEntrega) {
                    alert('Por favor selecciona una fecha de entrega.')
                    return
                  }
                  handleAction(pedidoAprobar.id, 'aprobar', { fechaEntrega })
                  setPedidoAprobar(null)
                  setFechaEntrega('')
                }}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <Check size={13} /> Aprobar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
