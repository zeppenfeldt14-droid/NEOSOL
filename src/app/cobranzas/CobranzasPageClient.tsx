'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Banknote, Globe, AlertTriangle, CheckCircle2, Clock,
  DollarSign, X, RefreshCw, CreditCard, Wallet, Building2,
  FileText, ChevronDown, ChevronUp, History
} from 'lucide-react'

interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
  availableZones: string[]
}

interface Pago {
  id: number
  monto: number
  metodoPago: string
  recargoAplicado: number
  montoFinal: number
  referencia: string | null
  notas: string | null
  registradoPorAlias: string
  creadoEn: string
}

interface Cobranza {
  id: number
  empresaNombre: string
  vendedorAlias: string
  zona: string
  montoOriginal: number
  saldoPendiente: number
  cuota: number
  totalCuotas: number
  fechaVencimiento: string | null
  estado: string
  diasAtraso: number | null
  pedido: { numeroPedido: string; condicionPago: string | null; plazosPago: string | null }
  pagos: Pago[]
}

const ESTADOS_COBRANZA = [
  { key: 'todos',     label: 'Todos',      color: 'text-secondary' },
  { key: 'pendiente', label: 'Pendiente',  color: 'text-yellow-400' },
  { key: 'vencida',   label: 'Vencida',    color: 'text-red-400' },
  { key: 'parcial',   label: 'Parcial',    color: 'text-blue-400' },
  { key: 'pagada',    label: 'Pagada',     color: 'text-green-400' },
]

const ESTADO_BADGES: Record<string, string> = {
  pendiente: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  vencida:   'bg-red-400/10 text-red-400 border-red-400/20',
  parcial:   'bg-blue-400/10 text-blue-400 border-blue-400/20',
  pagada:    'bg-green-400/10 text-green-400 border-green-400/20',
}

const METODOS_PAGO = [
  { key: 'efectivo',      label: 'Efectivo (Remito/Fact. B)', icon: Wallet,   recargo: false },
  { key: 'transferencia', label: 'Transferencia',              icon: CreditCard, recargo: false },
  { key: 'cheque',        label: 'Cheque',                     icon: FileText,  recargo: false },
  { key: 'financiera',    label: 'Financiera (+3% recargo)',   icon: Building2, recargo: true },
]

export function CobranzasPageClient({ userNivel, userAlias, userZona, availableZones }: Props) {
  const [selectedZone, setSelectedZone] = useState<string>(userNivel === 3 ? (userZona || '') : 'todas')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [cobranzas, setCobranzas] = useState<Cobranza[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Modal pago
  const [pagoModal, setPagoModal] = useState<Cobranza | null>(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoMetodo, setPagoMetodo] = useState('efectivo')
  const [pagoRef, setPagoRef] = useState('')
  const [pagoNotas, setPagoNotas] = useState('')
  const [pagoLoading, setPagoLoading] = useState(false)
  const [pagoError, setPagoError] = useState('')
  const [pagoSuccess, setPagoSuccess] = useState('')

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  const fetchCobranzas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedZone && selectedZone !== 'todas') params.set('zona', selectedZone)
    if (selectedEstado !== 'todos') params.set('estado', selectedEstado)
    const res = await fetch(`/api/cobranzas?${params.toString()}`)
    const data = await res.json()
    setCobranzas(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [selectedZone, selectedEstado])

  useEffect(() => { fetchCobranzas() }, [fetchCobranzas])

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const deudaTotal    = cobranzas.reduce((s, c) => s + c.saldoPendiente, 0)
  const vencidas      = cobranzas.filter(c => c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada')
  const deudaVencida  = vencidas.reduce((s, c) => s + c.saldoPendiente, 0)
  const por7dias      = cobranzas.filter(c => {
    if (!c.fechaVencimiento || c.estado === 'pagada') return false
    const diff = (new Date(c.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  })
  const pagadasMes    = cobranzas.filter(c => {
    if (c.estado !== 'pagada') return false
    const mes = new Date().getMonth()
    return new Date(c.pagos?.[0]?.creadoEn || 0).getMonth() === mes
  })
  const cobradoMes    = pagadasMes.reduce((s, c) => s + (c.pagos[0]?.montoFinal || 0), 0)

  // ─── Pago modal handlers ─────────────────────────────────────────────────
  const openPagoModal = (c: Cobranza) => {
    setPagoModal(c)
    setPagoMonto(c.saldoPendiente.toFixed(2))
    setPagoMetodo('efectivo')
    setPagoRef('')
    setPagoNotas('')
    setPagoError('')
    setPagoSuccess('')
  }

  const handleRegistrarPago = async () => {
    if (!pagoModal) return
    const monto = parseFloat(pagoMonto)
    if (isNaN(monto) || monto <= 0) { setPagoError('Ingresá un monto válido'); return }
    if (monto > pagoModal.saldoPendiente + 0.01) {
      setPagoError(`El monto no puede superar el saldo ($${pagoModal.saldoPendiente.toFixed(2)})`)
      return
    }

    setPagoLoading(true)
    setPagoError('')
    try {
      const res = await fetch(`/api/cobranzas/${pagoModal.id}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto, metodoPago: pagoMetodo, referencia: pagoRef, notas: pagoNotas }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const recargoMsg = data.recargoAplicado > 0 ? ` (incluye +3% financiera: ${fmt(data.recargoAplicado)})` : ''
      setPagoSuccess(`Pago registrado correctamente.${recargoMsg} Saldo restante: ${fmt(data.nuevoSaldo)}`)
      await fetchCobranzas()

      setTimeout(() => {
        setPagoModal(null)
        setPagoSuccess('')
      }, 2500)
    } catch (e: any) {
      setPagoError(e.message || 'Error al registrar el pago')
    } finally {
      setPagoLoading(false)
    }
  }

  // Derived for modal
  const montoNum = parseFloat(pagoMonto) || 0
  const recargoPreview = pagoMetodo === 'financiera' ? montoNum * 0.03 : 0
  const totalPreview = montoNum + recargoPreview

  const counts = {
    todos:     cobranzas.length,
    pendiente: cobranzas.filter(c => c.estado === 'pendiente').length,
    vencida:   cobranzas.filter(c => c.estado === 'vencida' || (c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada')).length,
    parcial:   cobranzas.filter(c => c.estado === 'parcial').length,
    pagada:    cobranzas.filter(c => c.estado === 'pagada').length,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Banknote className="text-yellow-400" size={26} />
            Cobranzas
          </h1>
          <p className="text-secondary text-sm mt-1">
            {userNivel === 3
              ? `Zona ${userZona} · Cuentas por cobrar`
              : 'Cartera de cobranzas consolidada por zona'}
          </p>
        </div>
        <button
          onClick={fetchCobranzas}
          className="btn btn-secondary text-xs flex items-center gap-2 border border-white/10"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                selectedZone === 'todas'
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
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
                    ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                    : 'border-white/10 text-secondary hover:text-white hover:border-white/30'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {ESTADOS_COBRANZA.map(e => (
          <button
            key={e.key}
            onClick={() => setSelectedEstado(e.key)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
              selectedEstado === e.key
                ? 'border-yellow-400 text-white bg-white/5'
                : `border-transparent ${e.color} hover:text-white`
            }`}
          >
            {e.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              selectedEstado === e.key ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/5 text-secondary'
            }`}>
              {counts[e.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Deuda Total',       value: fmt(deudaTotal),   icon: DollarSign,    color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Deuda Vencida',     value: fmt(deudaVencida), icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-400/10' },
          { label: 'Por Vencer (7d)',   value: por7dias.length,   icon: Clock,         color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Cobrado este mes',  value: fmt(cobradoMes),   icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-400/10' },
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

      {/* Alert vencidas */}
      {vencidas.length > 0 && (
        <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20 flex items-center gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
          <p className="text-red-400 text-sm font-semibold">
            <strong>{vencidas.length}</strong> cobranza{vencidas.length !== 1 ? 's' : ''} vencida{vencidas.length !== 1 ? 's' : ''} por un total de <strong>{fmt(deudaVencida)}</strong>
          </p>
        </div>
      )}

      {/* Cobranzas Table */}
      <div className="glass-panel card border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">
            Cuentas por Cobrar
            {cobranzas.length > 0 && <span className="ml-2 text-secondary text-xs font-normal">({cobranzas.length} registros)</span>}
          </span>
          <span className="text-secondary text-xs font-semibold">
            {selectedZone === 'todas' ? 'Todas las zonas' : `Zona ${selectedZone}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['', 'Cliente', 'Zona', 'Vendedor', 'Pedido', 'Cond. Pago', 'Monto Orig.', 'Saldo Pend.', 'Cuota', 'Vencimiento', 'Días', 'Estado', 'Acción'].map(col => (
                  <th key={col} className="px-3 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-secondary text-sm">Cargando cobranzas...</span>
                    </div>
                  </td>
                </tr>
              ) : cobranzas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Banknote size={36} className="text-white/10" />
                      <p className="text-secondary text-sm font-semibold">Sin cuentas por cobrar</p>
                      <p className="text-white/30 text-xs">Las cobranzas se generan al aprobar un pedido con plazos de pago</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cobranzas.map(c => {
                  const isExpanded = expandedId === c.id
                  const isVencida  = c.diasAtraso !== null && c.diasAtraso > 0 && c.estado !== 'pagada'
                  return (
                    <>
                      <tr
                        key={c.id}
                        className={`border-b border-white/5 transition-colors ${
                          isVencida ? 'bg-red-400/[0.03]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="px-3 py-3">
                          {c.pagos.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}
                              className="text-secondary hover:text-white transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-white font-semibold text-xs max-w-[160px] truncate">{c.empresaNombre || '—'}</td>
                        <td className="px-3 py-3 text-secondary text-xs">{c.zona}</td>
                        <td className="px-3 py-3 text-secondary text-xs">{c.vendedorAlias}</td>
                        <td className="px-3 py-3 text-primary font-bold text-xs">{c.pedido.numeroPedido}</td>
                        <td className="px-3 py-3 text-secondary text-xs">{c.pedido.condicionPago || '—'}</td>
                        <td className="px-3 py-3 text-white text-xs font-semibold">{fmt(c.montoOriginal)}</td>
                        <td className="px-3 py-3">
                          <span className={`font-black text-xs ${c.saldoPendiente > 0 ? (isVencida ? 'text-red-400' : 'text-yellow-400') : 'text-green-400'}`}>
                            {fmt(c.saldoPendiente)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-secondary text-xs text-center">
                          {c.cuota}/{c.totalCuotas}
                        </td>
                        <td className="px-3 py-3 text-secondary text-xs whitespace-nowrap">
                          {c.fechaVencimiento
                            ? new Date(c.fechaVencimiento).toLocaleDateString('es-AR')
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          {c.diasAtraso !== null && c.estado !== 'pagada' ? (
                            <span className={`text-xs font-black ${c.diasAtraso > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {c.diasAtraso > 0 ? `+${c.diasAtraso}d` : `${Math.abs(c.diasAtraso)}d`}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${ESTADO_BADGES[c.estado] || ''}`}>
                            {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {c.estado !== 'pagada' && (
                            <button
                              onClick={() => openPagoModal(c)}
                              className="px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 text-[10px] font-black border border-yellow-400/20 transition-all flex items-center gap-1 whitespace-nowrap"
                            >
                              <Banknote size={11} /> Cobrar
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded payment history */}
                      {isExpanded && c.pagos.length > 0 && (
                        <tr key={`${c.id}-hist`} className="bg-white/[0.01]">
                          <td colSpan={13} className="px-6 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <History size={12} className="text-secondary" />
                              <span className="text-[10px] uppercase font-black text-secondary tracking-wider">Historial de Pagos</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {c.pagos.map(p => (
                                <div key={p.id} className="flex items-center gap-4 text-xs py-1 border-b border-white/3 last:border-0">
                                  <span className="text-secondary">{new Date(p.creadoEn).toLocaleDateString('es-AR')}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                    p.metodoPago === 'financiera' ? 'bg-orange-400/10 text-orange-400' :
                                    p.metodoPago === 'cheque'     ? 'bg-blue-400/10 text-blue-400' :
                                    p.metodoPago === 'transferencia' ? 'bg-purple-400/10 text-purple-400' :
                                    'bg-green-400/10 text-green-400'
                                  }`}>{p.metodoPago}</span>
                                  <span className="text-white font-bold">{fmt(p.montoFinal)}</span>
                                  {p.recargoAplicado > 0 && <span className="text-orange-400 text-[10px]">(+{fmt(p.recargoAplicado)} fin.)</span>}
                                  {p.referencia && <span className="text-secondary">Ref: {p.referencia}</span>}
                                  <span className="text-white/30 ml-auto">{p.registradoPorAlias}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer totals */}
        {cobranzas.length > 0 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 text-xs">
              <span className="text-secondary">Registros: <strong className="text-white">{cobranzas.length}</strong></span>
              <span className="text-secondary">Deuda total: <strong className="text-yellow-400">{fmt(deudaTotal)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-secondary">
              <span>* Financiera aplica recargo del <strong className="text-orange-400">3%</strong> sobre el monto cobrado</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL REGISTRAR PAGO ────────────────────────────────────────── */}
      {pagoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-lg border border-white/10 p-6 flex flex-col gap-5 animate-fade-in shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Banknote size={18} className="text-yellow-400" />
                  Registrar Pago
                </h3>
                <p className="text-secondary text-xs mt-0.5">{pagoModal.empresaNombre} · {pagoModal.pedido.numeroPedido}</p>
              </div>
              <button onClick={() => setPagoModal(null)} className="text-secondary hover:text-white text-xl leading-none transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Saldo info */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-black/30 border border-white/5">
              <div>
                <p className="text-[10px] uppercase font-black text-secondary">Monto Original</p>
                <p className="text-white font-bold text-sm">{fmt(pagoModal.montoOriginal)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-secondary">Saldo Pendiente</p>
                <p className="text-yellow-400 font-black text-sm">{fmt(pagoModal.saldoPendiente)}</p>
              </div>
              {pagoModal.pedido.condicionPago && (
                <div>
                  <p className="text-[10px] uppercase font-black text-secondary">Condición Pago</p>
                  <p className="text-white font-semibold text-xs">{pagoModal.pedido.condicionPago}</p>
                </div>
              )}
              {pagoModal.pedido.plazosPago && (
                <div>
                  <p className="text-[10px] uppercase font-black text-secondary">Plazos</p>
                  <p className="text-white font-semibold text-xs">{pagoModal.pedido.plazosPago}</p>
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {METODOS_PAGO.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setPagoMetodo(m.key)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      pagoMetodo === m.key
                        ? m.recargo
                          ? 'bg-orange-400/10 border-orange-400/40 text-orange-400'
                          : 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-white/10 text-secondary hover:text-white hover:border-white/20'
                    }`}
                  >
                    <m.icon size={14} />
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Monto a Cobrar ($)</label>
              <input
                type="number"
                min="0.01"
                max={pagoModal.saldoPendiente}
                step="0.01"
                value={pagoMonto}
                onChange={e => setPagoMonto(e.target.value)}
                className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
              />
            </div>

            {/* Preview financiero */}
            {montoNum > 0 && (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary">Monto ingresado</span>
                  <span className="text-white font-bold">{fmt(montoNum)}</span>
                </div>
                {recargoPreview > 0 && (
                  <div className="flex justify-between text-orange-400">
                    <span>Recargo Financiera (3%)</span>
                    <span className="font-bold">+ {fmt(recargoPreview)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-1.5 mt-0.5">
                  <span className="text-white font-black">Total a Cobrar</span>
                  <span className="text-primary font-black text-sm">{fmt(totalPreview)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Saldo después del pago</span>
                  <span className={`font-bold ${Math.max(0, pagoModal.saldoPendiente - totalPreview) <= 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {fmt(Math.max(0, pagoModal.saldoPendiente - totalPreview))}
                  </span>
                </div>
              </div>
            )}

            {/* Referencia y notas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Referencia</label>
                <input
                  type="text"
                  placeholder="Nº cheque / comprobante..."
                  value={pagoRef}
                  onChange={e => setPagoRef(e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Notas</label>
                <input
                  type="text"
                  placeholder="Observaciones..."
                  value={pagoNotas}
                  onChange={e => setPagoNotas(e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
            </div>

            {pagoError && (
              <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} /> {pagoError}
              </div>
            )}
            {pagoSuccess && (
              <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} /> {pagoSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setPagoModal(null)}
                disabled={pagoLoading}
                className="btn btn-secondary text-xs px-5"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={pagoLoading || montoNum <= 0}
                className="btn btn-primary text-xs px-6 shadow-lg shadow-primary/20 font-black flex items-center gap-2"
              >
                <Banknote size={14} />
                {pagoLoading ? 'Registrando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
