'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Globe, BarChart3, FileText, DollarSign, RefreshCw, Eye } from 'lucide-react'
import { PedidoDetalleModal } from '@/components/PedidoDetalleModal'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface Factura {
  id: number
  numeroFactura: string
  tipo: string
  subtotal: number
  iva: number
  recargo: number
  total: number
  estado: string
  creadoEn: string
  pedidoId: number
  pedido: {
    numeroPedido: string
    zona: string
    vendedorAlias: string
    empresa: { nombre: string }
  }
}

const TIPO_BADGES: Record<string, string> = {
  A:      'bg-blue-400/10 text-blue-400 border-blue-400/20',
  B:      'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  remito: 'bg-white/5 text-secondary border-white/10',
}

const ESTADO_FAC: Record<string, string> = {
  pendiente: 'text-yellow-400',
  pagada:    'text-green-400',
  parcial:   'text-blue-400',
  anulada:   'text-red-400',
}

export function VentasPageClient({ userNivel, userAlias, userZona, availableZones }: Props) {
  const [selectedZone, setSelectedZone] = useState<string>(userNivel === 3 ? (userZona || '') : 'todas')
  const [selectedPeriod, setSelectedPeriod] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('mes')
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading]   = useState(true)

  const [selectedPedidoDetalle, setSelectedPedidoDetalle] = useState<any | null>(null)
  const [isFetchingPedido, setIsFetchingPedido] = useState<number | null>(null)

  const fetchDetallePedido = async (pedidoId: number) => {
    setIsFetchingPedido(pedidoId)
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPedidoDetalle(data)
      } else {
        alert('Error al obtener el detalle del pedido.')
      }
    } catch (e) {
      console.error(e)
      alert('Error de red al cargar el pedido.')
    } finally {
      setIsFetchingPedido(null)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const fetchFacturas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedZone && selectedZone !== 'todas') params.set('zona', selectedZone)
    const res = await fetch(`/api/facturas?${params.toString()}`)
    const data = await res.json()
    const all: Factura[] = Array.isArray(data) ? data : []

    // Period filter
    const now = new Date()
    const filtered = all.filter(f => {
      const d = new Date(f.creadoEn)
      if (selectedPeriod === 'hoy') {
        return d.toDateString() === now.toDateString()
      } else if (selectedPeriod === 'semana') {
        const semana = new Date(now); semana.setDate(now.getDate() - 7)
        return d >= semana
      } else if (selectedPeriod === 'mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      return true
    })
    setFacturas(filtered)
    setLoading(false)
  }, [selectedZone, selectedPeriod])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  // KPIs
  const totalFacturado = facturas.reduce((s, f) => s + f.total, 0)
  const facturasA      = facturas.filter(f => f.tipo === 'A')
  const facturasB      = facturas.filter(f => f.tipo === 'B' || f.tipo === 'remito')
  const totalA         = facturasA.reduce((s, f) => s + f.total, 0)
  const totalB         = facturasB.reduce((s, f) => s + f.total, 0)
  const totalIVA       = facturas.reduce((s, f) => s + f.iva, 0)
  const totalRecargo   = facturas.reduce((s, f) => s + f.recargo, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="text-green-400" size={26} />
            Ventas
          </h1>
          <p className="text-secondary text-sm mt-1">
            {userNivel === 3
              ? `Zona ${userZona} · Mis ventas y facturación`
              : 'Historial consolidado de ventas por zona'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchFacturas} className="btn btn-secondary text-xs flex items-center gap-2 border border-white/10">
            <RefreshCw size={13} /> Actualizar
          </button>
          {/* Period Selector */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
            {(['hoy', 'semana', 'mes', 'todo'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  selectedPeriod === p
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                    : 'text-secondary hover:text-white'
                }`}
              >
                {p === 'todo' ? 'Todo' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Filter */}
      {userNivel < 3 && (
        <div className="glass-panel card p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center border border-white/5">
          <div className="flex items-center gap-2 text-secondary text-sm font-semibold">
            <Globe size={15} />
            <span>Zona:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedZone('todas')}
              className={`btn-toggle ${
                selectedZone === 'todas' ? 'active' : ''
              }`}
            >
              Todas las Zonas
            </button>
            {availableZones.map(z => (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`btn-toggle ${
                selectedZone === z ? 'active' : ''
              }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Facturado',    value: fmt(totalFacturado), icon: DollarSign, color: 'text-green-400',  bg: 'bg-green-400/10' },
          { label: 'Factura A (c/IVA)', value: fmt(totalA),         icon: FileText,   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
          { label: 'Fact. B / Remito',  value: fmt(totalB),         icon: FileText,   color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Comprobantes',       value: facturas.length,     icon: BarChart3,  color: 'text-primary',    bg: 'bg-primary/10' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel card p-4 flex items-center gap-4 border border-white/5">
            <div className={`${kpi.bg} p-3 rounded-xl flex-shrink-0`}>
              <kpi.icon className={kpi.color} size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-secondary text-xs font-semibold">{kpi.label}</p>
              <p className="text-white text-sm font-black truncate">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen fiscal */}
      {facturas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel card p-4 border border-white/5">
            <p className="text-[10px] uppercase font-black text-secondary mb-2">Desglose Fiscal</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-secondary">Base imponible (sin IVA)</span>
                <span className="text-white font-bold">{fmt(facturas.reduce((s, f) => s + f.subtotal, 0))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-secondary">IVA 21% total</span>
                <span className="text-blue-400 font-bold">+ {fmt(totalIVA)}</span>
              </div>
              {totalRecargo > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Recargo Financiera 3%</span>
                  <span className="text-orange-400 font-bold">+ {fmt(totalRecargo)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                <span className="text-white font-black">TOTAL</span>
                <span className="text-green-400 font-black">{fmt(totalFacturado)}</span>
              </div>
            </div>
          </div>
          <div className="glass-panel card p-4 border border-white/5">
            <p className="text-[10px] uppercase font-black text-secondary mb-2">Distribución por Tipo</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-400/10 text-blue-400 border border-blue-400/20">A</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: totalFacturado > 0 ? `${(totalA / totalFacturado) * 100}%` : '0%' }} />
                </div>
                <span className="text-white text-xs font-bold">{totalFacturado > 0 ? ((totalA / totalFacturado) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">B</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: totalFacturado > 0 ? `${(totalB / totalFacturado) * 100}%` : '0%' }} />
                </div>
                <span className="text-white text-xs font-bold">{totalFacturado > 0 ? ((totalB / totalFacturado) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>
          <div className="glass-panel card p-4 border border-white/5">
            <p className="text-[10px] uppercase font-black text-secondary mb-2">Conteo por Tipo</p>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Facturas A</span>
                <span className="text-blue-400 font-black">{facturasA.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Facturas B / Remitos</span>
                <span className="text-yellow-400 font-black">{facturasB.length}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-white font-bold">Total</span>
                <span className="text-white font-black">{facturas.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facturas Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">Facturas y Comprobantes</span>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 text-[10px] font-black border border-blue-400/20">A · con IVA</span>
            <span className="px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-black border border-yellow-400/20">B · Remito</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Nº Factura', 'Tipo', 'Cliente', 'Zona', 'Vendedor', 'Pedido', 'Base s/IVA', 'IVA 21%', 'Recargo Fin.', 'Total', 'Estado', 'Fecha', ''].map(col => (
                  <th key={col} className="px-3 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando facturas...</span>
                    </div>
                  </td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">Sin facturación en este período</p>
                      <p className="text-white/30 text-xs">Las facturas se generan automáticamente al aprobar un pedido</p>
                    </div>
                  </td>
                </tr>
              ) : (
                facturas.map(f => (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-primary font-black text-xs">{f.numeroFactura}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${TIPO_BADGES[f.tipo] || ''}`}>
                        {f.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white font-semibold text-xs max-w-[140px] truncate">{f.pedido.empresa.nombre}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.pedido.zona}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.pedido.vendedorAlias}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.pedido.numeroPedido}</td>
                    <td className="px-3 py-3 text-white text-xs">{fmt(f.subtotal)}</td>
                    <td className="px-3 py-3 text-blue-400 text-xs font-semibold">{f.iva > 0 ? fmt(f.iva) : '—'}</td>
                    <td className="px-3 py-3 text-orange-400 text-xs font-semibold">{f.recargo > 0 ? fmt(f.recargo) : '—'}</td>
                    <td className="px-3 py-3 text-white font-black text-xs">{fmt(f.total)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold capitalize ${ESTADO_FAC[f.estado] || 'text-secondary'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-secondary text-xs whitespace-nowrap">
                      {new Date(f.creadoEn).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => fetchDetallePedido(f.pedidoId)}
                        disabled={isFetchingPedido === f.pedidoId}
                        className="btn-action text-secondary hover:text-white"
                        title="Ver detalles del pedido"
                      >
                        {isFetchingPedido === f.pedidoId ? (
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Eye size={13} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {facturas.length > 0 && (
          <div className="p-4 border-t border-white/5 flex justify-between items-center text-xs">
            <span className="text-secondary">{facturas.length} comprobante{facturas.length !== 1 ? 's' : ''}</span>
            <span className="text-green-400 font-black text-sm">Total: {fmt(totalFacturado)}</span>
          </div>
        )}
      </div>

      {/* Modal de Pedido Global */}
      {selectedPedidoDetalle && (
        <PedidoDetalleModal
          pedido={selectedPedidoDetalle}
          onClose={() => setSelectedPedidoDetalle(null)}
        />
      )}
    </div>
  )
}
