'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, BarChart3, FileText, DollarSign, RefreshCw, Eye, Calendar } from 'lucide-react'
import { PedidoDetalleModal } from '@/components/PedidoDetalleModal'
import SharedPeriodFilter from '@/components/SharedPeriodFilter'
import { ClientesActivosList } from './ClientesActivosList'
import { ComisionesList } from './ComisionesList'

interface Props {
  zonaName: string
  userNivel: number
  userAlias: string
}

interface Factura {
  id: number
  pedidoId: number
  numeroFactura: string
  tipo: string
  empresaNombre: string
  vendedorAlias: string
  subtotal: number
  iva: number
  recargo: number
  total: number
  estado: string
  creadoEn: string
}

const MESES = [
  { value: 0, label: 'Enero' },
  { value: 1, label: 'Febrero' },
  { value: 2, label: 'Marzo' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Mayo' },
  { value: 5, label: 'Junio' },
  { value: 6, label: 'Julio' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Septiembre' },
  { value: 9, label: 'Octubre' },
  { value: 10, label: 'Noviembre' },
  { value: 11, label: 'Diciembre' },
]

const TRIMESTRES = [
  { value: 'Q1', label: '1er Trimestre (Ene-Mar)' },
  { value: 'Q2', label: '2do Trimestre (Abr-Jun)' },
  { value: 'Q3', label: '3er Trimestre (Jul-Sep)' },
  { value: 'Q4', label: '4to Trimestre (Oct-Dic)' },
]

export function ZonaVentasClient({ zonaName, userNivel, userAlias }: Props) {
  const [activeTab, setActiveTab] = useState<'facturacion' | 'clientes' | 'comisiones'>('facturacion')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes')
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)

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
    params.set('zona', zonaName)
    const res = await fetch(`/api/facturas?${params.toString()}`)
    const data = await res.json()
    const all: Factura[] = Array.isArray(data) ? data : []

    // Date filter
    const now = new Date()
    const currentYear = now.getFullYear()
    
    const filtered = all.filter(f => {
      const d = new Date(f.creadoEn)
      if (d.getFullYear() !== currentYear) return false
      if (selectedPeriod === 'todo') return true
      if (selectedPeriod === 'hoy') {
        return d.toDateString() === now.toDateString()
      }
      if (selectedPeriod === 'semana') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      }
      if (selectedPeriod === 'mes') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      if (selectedPeriod.startsWith('Q')) {
        const month = d.getMonth()
        if (selectedPeriod === 'Q1') return month >= 0 && month <= 2
        if (selectedPeriod === 'Q2') return month >= 3 && month <= 5
        if (selectedPeriod === 'Q3') return month >= 6 && month <= 8
        if (selectedPeriod === 'Q4') return month >= 9 && month <= 11
      } else {
        const selectedMonths = selectedPeriod.split(',').map(Number)
        return selectedMonths.includes(d.getMonth())
      }
      return false
    })
    
    setFacturas(filtered)
    setLoading(false)
  }, [zonaName, selectedPeriod])

  useEffect(() => { fetchFacturas() }, [fetchFacturas])

  // KPIs
  const totalFacturado = facturas.reduce((s, f) => s + f.total, 0)
  const facturasA      = facturas.filter(f => f.tipo === 'A')
  const facturasB      = facturas.filter(f => f.tipo === 'B' || f.tipo === 'remito')
  const totalA         = facturasA.reduce((s, f) => s + f.total, 0)
  const totalB         = facturasB.reduce((s, f) => s + f.total, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="text-green-400" size={26} />
            Gestión de Ventas
          </h1>
          <p className="text-secondary text-sm mt-1">
            Zona {zonaName} · Historial y KPIs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SharedPeriodFilter 
            currentPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />

          <button onClick={fetchFacturas} className="btn btn-secondary text-xs flex items-center gap-2 border border-white/10">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('facturacion')}
          className={`btn-toggle ${activeTab === 'facturacion' ? 'active' : ''}`}
        >
          Resumen de Facturación
        </button>
        <button
          onClick={() => setActiveTab('clientes')}
          className={`btn-toggle ${activeTab === 'clientes' ? 'active' : ''}`}
        >
          Clientes Activos
        </button>
        <button
          onClick={() => setActiveTab('comisiones')}
          className={`btn-toggle ${activeTab === 'comisiones' ? 'active' : ''}`}
        >
          Vista de Comisiones
        </button>
      </div>

      {activeTab === 'facturacion' && (
        <>
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

      {/* Facturas Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">
            Listado de Facturas ({
              selectedPeriod.startsWith('Q') 
                ? TRIMESTRES.find(t => t.value === selectedPeriod)?.label 
                : MESES.find(m => m.value.toString() === selectedPeriod)?.label
            })
          </span>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Nº Factura', 'Tipo', 'Cliente', 'Vendedor', 'Pedido', 'Base s/IVA', 'IVA 21%', 'Recargo Fin.', 'Total', 'Fecha', 'Detalle'].map(col => (
                  <th key={col} className="px-3 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando facturas...</span>
                    </div>
                  </td>
                </tr>
              ) : facturas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">Sin facturas en este periodo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                facturas.map(f => (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3 text-white font-semibold text-xs whitespace-nowrap">{f.numeroFactura}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        f.tipo === 'A' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                      }`}>
                        {f.tipo === 'A' ? 'Factura A' : 'Fact. B / Remito'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-secondary text-xs max-w-[160px] truncate">{f.empresaNombre || '—'}</td>
                    <td className="px-3 py-3 text-secondary text-xs">{f.vendedorAlias}</td>
                    <td className="px-3 py-3 text-primary font-bold text-xs">{f.pedidoId}</td>
                    <td className="px-3 py-3 text-secondary text-xs font-semibold">{fmt(f.subtotal)}</td>
                    <td className="px-3 py-3 text-blue-400/70 text-xs">{fmt(f.iva)}</td>
                    <td className="px-3 py-3 text-orange-400/70 text-xs">{fmt(f.recargo)}</td>
                    <td className="px-3 py-3">
                      <span className="font-black text-xs text-white">{fmt(f.total)}</span>
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
      </div>

      {/* Mobile view for Facturas */}
      <div className="block md:hidden flex flex-col gap-3 p-4 bg-black/20">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-secondary text-sm">Cargando...</span>
          </div>
        ) : facturas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <FileText size={36} className="text-white/10" />
            <p className="text-secondary text-sm font-semibold">Sin facturas</p>
          </div>
        ) : (
          facturas.map(f => (
            <div key={f.id} className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-white/5 pb-2">
                <div>
                  <div className="text-white font-bold text-sm mb-1">{f.empresaNombre || '—'}</div>
                  <div className="text-xs text-secondary flex gap-2 items-center">
                    <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/70">#{f.numeroFactura}</span>
                    <span>{new Date(f.creadoEn).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  f.tipo === 'A' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                }`}>
                  {f.tipo === 'A' ? 'A' : 'B/R'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-secondary mb-0.5">Vendedor</div>
                  <div className="text-white truncate">{f.vendedorAlias}</div>
                </div>
                <div className="text-right">
                  <div className="text-secondary mb-0.5">Pedido Ref</div>
                  <div className="text-primary font-bold">#{f.pedidoId}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] uppercase font-bold text-secondary pt-2 border-t border-white/5">
                <div>Base: <span className="text-white block mt-0.5 normal-case font-normal text-xs">{fmt(f.subtotal)}</span></div>
                <div className="text-center">IVA/Rec: <span className="text-white block mt-0.5 normal-case font-normal text-xs">{fmt(f.iva + f.recargo)}</span></div>
                <div className="text-right">Total: <span className="text-primary block mt-0.5 normal-case text-sm font-black">{fmt(f.total)}</span></div>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5 mt-1">
                <button
                  onClick={() => fetchDetallePedido(f.pedidoId)}
                  disabled={isFetchingPedido === f.pedidoId}
                  className="btn btn-secondary text-xs flex items-center justify-center gap-2 flex-1"
                >
                  {isFetchingPedido === f.pedidoId ? (
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Eye size={14} /> Ver Pedido</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      )}

      {activeTab === 'clientes' && (
        <ClientesActivosList zonaName={zonaName} />
      )}

      {activeTab === 'comisiones' && (
        <ComisionesList zonaName={zonaName} selectedPeriod={selectedPeriod} />
      )}

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
