'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Search, ChevronDown, Plus, Minus, Trash2,
  CheckCircle2, AlertCircle, Info, Send, Save, X, Package,
  Calculator, FileText, Banknote, Percent, Gift
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Producto {
  id: number
  codigoInterno: string
  nombre: string
  linea: string
  precioPaquete: number
  paqPorCaja: number
  precioCaja: number
}

interface Empresa {
  id: number
  nombre: string
  cuit: string | null
  zona: string | null
  estado: string
  responsable: string | null
  direccion: string | null
  telefono: string | null
}

interface LineaPedido {
  producto: Producto
  cantidadCajas: number
  cajasBonus: number
  descripcionBonus: string
  precioCajaNegociado: number
  subtotal: number
}

const LINEAS_LABELS: Record<string, string> = {
  pack_individual: 'Línea Pack Individual',
  tripack:         'Línea Tripack',
  minis:           'Línea Minis',
  snacks:          'Línea Snacks Horneados',
}

const CONDICIONES_PAGO = [
  { label: '20% / 80%', pA: 20, pB: 80 },
  { label: '30% / 70%', pA: 30, pB: 70 },
  { label: '50% / 50%', pA: 50, pB: 50 },
  { label: '70% / 30%', pA: 70, pB: 30 },
  { label: '100% A (con IVA)', pA: 100, pB: 0 },
  { label: '100% B (sin IVA)', pA: 0, pB: 100 },
  { label: 'Personalizada', pA: -1, pB: -1 },
]

const IVA_RATE = 0.21
const FINANCIERA_RATE = 0.03
const PROMO_10x1_TRIGGER = 10

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  userNivel: number
  userAlias: string
  userZona: string | null
}

export function NuevoPedidoClient({ userNivel, userAlias, userZona }: Props) {
  const router = useRouter()

  // Data
  const [productos, setProductos]   = useState<Producto[]>([])
  const [empresas, setEmpresas]     = useState<Empresa[]>([])
  const [loading, setLoading]       = useState(true)

  // Form state
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null)
  const [empresaBusqueda, setEmpresaBusqueda]         = useState('')
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false)
  const [lineasPedido, setLineasPedido]               = useState<LineaPedido[]>([])

  // Negociación
  const [condicionIdx, setCondicionIdx]       = useState(0)
  const [pctACustom, setPctACustom]           = useState(20)
  const [pctBCustom, setPctBCustom]           = useState(80)
  const [aplicaFinanciera, setAplicaFinanciera] = useState(false)
  const [plazosPago, setPlazosPago]           = useState('')
  const [observaciones, setObservaciones]     = useState('')
  const [acuerdosComerciales, setAcuerdosComerciales] = useState('')
  const [requierePresupuesto, setRequierePresupuesto] = useState(false)
  const [turnoEntrega, setTurnoEntrega]       = useState<'SI' | 'NO' | ''>('')
  const [aplicaPromo10x1, setAplicaPromo10x1] = useState(false)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // ── Fetch data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      const zoneQueryParam = userNivel === 3 ? (userZona || '') : ''
      const [prodRes, empRes] = await Promise.all([
        fetch('/api/productos'),
        fetch(`/api/empresas?estado=activo&zona=${zoneQueryParam}&limit=200`),
      ])
      const prodData = await prodRes.json()
      const empData  = await empRes.json()
      setProductos(Array.isArray(prodData) ? prodData : [])
      setEmpresas(Array.isArray(empData) ? empData : (empData.empresas || []))
      setLoading(false)
    }
    fetchData()
  }, [userZona])

  // ── Derived values ───────────────────────────────────────────────────────
  const condicion = CONDICIONES_PAGO[condicionIdx]
  const pctA = condicion.pA === -1 ? pctACustom : condicion.pA
  const pctB = condicion.pB === -1 ? pctBCustom : condicion.pB

  const subtotalSinIVA = lineasPedido.reduce((s, l) => s + l.subtotal, 0)
  const montoParteA    = subtotalSinIVA * (pctA / 100)
  const montoParteB    = subtotalSinIVA * (pctB / 100)
  const montoIVA       = montoParteA * IVA_RATE
  const baseFinanciera = subtotalSinIVA + montoIVA
  const montoFinanciera = aplicaFinanciera ? baseFinanciera * FINANCIERA_RATE : 0
  const totalGeneral   = subtotalSinIVA + montoIVA + montoFinanciera

  const totalCajas     = lineasPedido.reduce((s, l) => s + l.cantidadCajas, 0)
  const totalBonus     = lineasPedido.reduce((s, l) => s + l.cajasBonus, 0)

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  // ── Add product line ─────────────────────────────────────────────────────
  const agregarProducto = (prod: Producto) => {
    if (lineasPedido.find(l => l.producto.id === prod.id)) return
    setLineasPedido(prev => [...prev, {
      producto: prod,
      cantidadCajas: 0,
      cajasBonus: 0,
      descripcionBonus: '',
      precioCajaNegociado: prod.precioCaja,
      subtotal: 0,
    }])
  }

  const actualizarCantidad = (prodId: number, delta: number) => {
    setLineasPedido(prev => prev.map(l => {
      if (l.producto.id !== prodId) return l
      const nuevaCantidad = Math.max(0, l.cantidadCajas + delta)
      const bonus = aplicaPromo10x1 ? Math.floor(nuevaCantidad / PROMO_10x1_TRIGGER) : 0
      return {
        ...l,
        cantidadCajas: nuevaCantidad,
        cajasBonus: bonus,
        descripcionBonus: bonus > 0 ? `Bonificación 10x1: ${bonus} caja(s)` : '',
        subtotal: nuevaCantidad * l.precioCajaNegociado,
      }
    }))
  }

  const setCantidadDirecta = (prodId: number, valor: number) => {
    const nuevaCantidad = Math.max(0, valor || 0)
    setLineasPedido(prev => prev.map(l => {
      if (l.producto.id !== prodId) return l
      const bonus = aplicaPromo10x1 ? Math.floor(nuevaCantidad / PROMO_10x1_TRIGGER) : 0
      return {
        ...l,
        cantidadCajas: nuevaCantidad,
        cajasBonus: bonus,
        descripcionBonus: bonus > 0 ? `Bonificación 10x1: ${bonus} caja(s)` : '',
        subtotal: nuevaCantidad * l.precioCajaNegociado,
      }
    }))
  }

  const actualizarPrecioNegociado = (prodId: number, nuevoPrecio: number) => {
    setLineasPedido(prev => {
      const exists = prev.find(l => l.producto.id === prodId)
      if (!exists) {
        const prod = productos.find(p => p.id === prodId)!
        return [...prev, {
          producto: prod,
          cantidadCajas: 0,
          cajasBonus: 0,
          descripcionBonus: '',
          precioCajaNegociado: nuevoPrecio,
          subtotal: 0,
        }]
      }
      return prev.map(l => {
        if (l.producto.id !== prodId) return l
        return {
          ...l,
          precioCajaNegociado: nuevoPrecio,
          subtotal: l.cantidadCajas * nuevoPrecio,
        }
      })
    })
  }

  const eliminarLinea = (prodId: number) =>
    setLineasPedido(prev => prev.filter(l => l.producto.id !== prodId))

  // Recalculate bonuses when promo toggled
  useEffect(() => {
    setLineasPedido(prev => prev.map(l => {
      const bonus = aplicaPromo10x1 ? Math.floor(l.cantidadCajas / PROMO_10x1_TRIGGER) : 0
      return {
        ...l,
        cajasBonus: bonus,
        descripcionBonus: bonus > 0 ? `Bonificación 10x1: ${bonus} caja(s)` : '',
      }
    }))
  }, [aplicaPromo10x1])

  // ── Custom pct sync ──────────────────────────────────────────────────────
  const handlePctAChange = (v: number) => {
    setPctACustom(Math.min(100, Math.max(0, v)))
    setPctBCustom(100 - Math.min(100, Math.max(0, v)))
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleGuardar = async (enviarAlSupervisor = false) => {
    if (!empresaSeleccionada) { setError('Seleccioná una empresa'); return }
    if (lineasPedido.filter(l => l.cantidadCajas > 0).length === 0) {
      setError('Ingresá al menos un producto con cantidad mayor a 0')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: empresaSeleccionada.id,
          detalles: lineasPedido
            .filter(l => l.cantidadCajas > 0)
            .map(l => ({
              productoId: l.producto.id,
              cantidadCajas: l.cantidadCajas,
              cajasBonus: l.cajasBonus,
              descripcionBonus: l.descripcionBonus,
              precioCajaSnapshot: l.precioCajaNegociado,
            })),
          condicionPago: condicion.label === 'Personalizada' ? `${pctA}/${pctB}` : condicion.label,
          porcentajePagoA: pctA,
          porcentajePagoB: pctB,
          aplicaFinanciera,
          plazosPago,
          observaciones,
          acuerdosComerciales,
          requierePresupuesto,
          turnoEntrega: turnoEntrega || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // If sending to supervisor, patch status
      if (enviarAlSupervisor) {
        await fetch(`/api/pedidos/${data.pedido.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'enviar' }),
        })
      }

      router.push('/pedidos')
    } catch (e: any) {
      setError(e.message || 'Error al guardar el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Company filter ───────────────────────────────────────────────────────
  const empresasFiltradas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(empresaBusqueda.toLowerCase()) ||
    (e.cuit || '').includes(empresaBusqueda)
  ).slice(0, 8)

  // Group products by line
  const productosPorLinea = productos.reduce((acc, p) => {
    const linea = p.linea || 'otros'
    if (!acc[linea]) acc[linea] = []
    acc[linea].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-secondary text-sm">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="text-primary" size={26} />
            Nuevo Pedido
          </h1>
          <p className="text-secondary text-sm mt-1">
            Nota de Pedido · NEOSOL
          </p>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary text-xs flex items-center gap-2">
          <X size={14} /> Cancelar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center gap-3 text-red-400 text-sm font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── LEFT: Main form (2/3) ───────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* ── Sección 1: Datos del cliente ─────────────────────────────── */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <FileText size={15} className="text-primary" />
              Datos del Cliente
            </h2>

            {/* Empresa selector */}
            <div className="form-group mb-0 relative">
              <label className="form-label text-[10px] uppercase font-black text-secondary">
                Razón Social / Empresa *
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary z-10" />
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={empresaSeleccionada ? empresaSeleccionada.nombre : empresaBusqueda}
                  onChange={e => {
                    setEmpresaBusqueda(e.target.value)
                    setEmpresaSeleccionada(null)
                    setShowEmpresaDropdown(true)
                  }}
                  onFocus={() => setShowEmpresaDropdown(true)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl pl-9"
                />
                {empresaSeleccionada && (
                  <button
                    onClick={() => { setEmpresaSeleccionada(null); setEmpresaBusqueda('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {showEmpresaDropdown && !empresaSeleccionada && empresasFiltradas.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full glass-panel card border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                  {empresasFiltradas.map(e => (
                    <button
                      key={e.id}
                      onClick={() => {
                        setEmpresaSeleccionada(e)
                        setShowEmpresaDropdown(false)
                        setEmpresaBusqueda('')
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <p className="text-white text-xs font-bold">{e.nombre}</p>
                      <p className="text-secondary text-[10px]">
                        {e.cuit ? `CUIT: ${e.cuit} · ` : ''}{e.zona || '—'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected company details */}
            {empresaSeleccionada && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                {[
                  { label: 'CUIT', value: empresaSeleccionada.cuit || '—' },
                  { label: 'Zona', value: empresaSeleccionada.zona || '—' },
                  { label: 'Responsable', value: empresaSeleccionada.responsable || '—' },
                  { label: 'Dirección', value: empresaSeleccionada.direccion || '—' },
                  { label: 'Teléfono', value: empresaSeleccionada.telefono || '—' },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[10px] uppercase font-black text-secondary">{f.label}</p>
                    <p className="text-white text-xs font-semibold mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sección 2: Lista de productos ────────────────────────────── */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-white font-bold text-sm flex items-center gap-2">
                <Package size={15} className="text-primary" />
                Productos · Lista de Precios Mayo 2026
              </h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setAplicaPromo10x1(!aplicaPromo10x1)}
                    className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${aplicaPromo10x1 ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${aplicaPromo10x1 ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs font-bold text-secondary flex items-center gap-1">
                    <Gift size={12} className={aplicaPromo10x1 ? 'text-primary' : ''} />
                    Promo 10x1
                  </span>
                </label>
              </div>
            </div>

            {aplicaPromo10x1 && (
              <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center gap-2">
                <Gift size={13} />
                Activa: por cada 10 cajas se regala 1 automáticamente
              </div>
            )}

            {/* Product table per line */}
            {Object.entries(productosPorLinea).map(([linea, prods]) => (
              <div key={linea} className="flex flex-col gap-2">
                <div className="px-1 py-1 text-[10px] font-black uppercase text-primary/70 tracking-widest border-b border-white/5">
                  {LINEAS_LABELS[linea] || linea}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {[
                          { label: 'Cód.', align: 'text-left' },
                          { label: 'Producto', align: 'text-left' },
                          { label: 'Paq/Caja', align: 'text-center' },
                          { label: 'Precio Caja (sin IVA)', align: 'text-right' },
                          { label: 'Cantidad', align: 'text-center' },
                          { label: 'Bonus', align: 'text-center' },
                          { label: 'Subtotal', align: 'text-right' },
                          { label: '', align: 'text-center' }
                        ].map((col, idx) => (
                          <th key={idx} className={`px-2 py-1.5 text-[9px] font-black uppercase text-white/30 tracking-wider whitespace-nowrap ${col.align}`}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prods.map(prod => {
                        const linea_ = lineasPedido.find(l => l.producto.id === prod.id)
                        return (
                          <tr key={prod.id} className={`border-t border-white/5 transition-colors ${linea_ && linea_.cantidadCajas > 0 ? 'bg-primary/5' : 'hover:bg-white/[0.02]'}`}>
                            <td className="px-2 py-2 text-primary font-bold text-[10px] text-left">{prod.codigoInterno}</td>
                            <td className="px-2 py-2 text-white text-[11px] font-semibold whitespace-nowrap text-left">{prod.nombre}</td>
                            <td className="px-2 py-2 text-secondary text-[11px] text-center">{prod.paqPorCaja}</td>
                            {/* Negotiated Price Input */}
                            <td className="px-2 py-2 text-right">
                              <div className="inline-block text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={linea_ ? linea_.precioCajaNegociado : prod.precioCaja}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0
                                    actualizarPrecioNegociado(prod.id, val)
                                  }}
                                  className={`w-24 bg-black/40 border rounded-lg px-2 py-1 text-xs text-white font-semibold text-right focus:border-primary focus:outline-none ${
                                    linea_ && Math.abs(linea_.precioCajaNegociado - prod.precioCaja) > 0.01
                                      ? 'border-yellow-400/50 text-yellow-400 font-bold bg-yellow-400/[0.03]'
                                      : 'border-white/10'
                                  }`}
                                />
                                {linea_ && Math.abs(linea_.precioCajaNegociado - prod.precioCaja) > 0.01 && (
                                  <span className="block text-[8px] text-yellow-400 font-bold text-right mt-0.5">Negociado</span>
                                )}
                              </div>
                            </td>

                            {/* Quantity input */}
                            <td className="px-2 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => linea_ ? actualizarCantidad(prod.id, -1) : null}
                                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-secondary hover:text-white transition-all"
                                >
                                  <Minus size={10} />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={linea_?.cantidadCajas || 0}
                                  onChange={e => {
                                    if (!linea_) agregarProducto(prod)
                                    setCantidadDirecta(prod.id, parseInt(e.target.value) || 0)
                                  }}
                                  onFocus={() => !linea_ && agregarProducto(prod)}
                                  className="w-14 text-center bg-black/40 border border-white/10 rounded-lg py-1 text-xs text-white font-bold focus:border-primary focus:outline-none"
                                />
                                <button
                                  onClick={() => {
                                    if (!linea_) agregarProducto(prod)
                                    actualizarCantidad(prod.id, 1)
                                  }}
                                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-primary/30 flex items-center justify-center text-secondary hover:text-primary transition-all"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>

                            {/* Bonus */}
                            <td className="px-2 py-2 text-center">
                              {linea_ && linea_.cajasBonus > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black">
                                  +{linea_.cajasBonus}
                                </span>
                              ) : (
                                <span className="text-white/20 text-[10px]">—</span>
                              )}
                            </td>

                            {/* Subtotal */}
                            <td className="px-2 py-2 text-white text-[11px] font-black whitespace-nowrap text-right">
                              {linea_ && linea_.cantidadCajas > 0 ? fmt(linea_.subtotal) : '—'}
                            </td>

                            {/* Remove */}
                            <td className="px-2 py-2 text-center">
                              {linea_ && (
                                <button
                                  onClick={() => eliminarLinea(prod.id)}
                                  className="w-6 h-6 rounded-lg text-secondary hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {lineasPedido.filter(l => l.cajasBonus > 0).length > 0 && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-semibold text-primary flex items-center gap-2">
                <Gift size={13} />
                Total cajas bonificadas: <strong>{totalBonus}</strong> caja(s) de regalo
              </div>
            )}
          </div>

          {/* ── Sección 3: Logística ─────────────────────────────────────── */}
          <div className="glass-panel card border border-white/5 p-6 flex flex-col gap-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <Info size={15} className="text-secondary" />
              Logística y Observaciones
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Turno entrega */}
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">
                  Turno para entrega
                </label>
                <div className="flex gap-3">
                  {['SI', 'NO'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTurnoEntrega(turnoEntrega === opt ? '' : opt as 'SI' | 'NO')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        turnoEntrega === opt
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                          : 'border-white/10 text-secondary hover:text-white hover:border-white/30'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requiere presupuesto */}
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">
                  Requiere Presupuesto
                </label>
                <div className="flex gap-3">
                  {['SI', 'NO'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setRequierePresupuesto(opt === 'SI')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        (requierePresupuesto && opt === 'SI') || (!requierePresupuesto && opt === 'NO')
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                          : 'border-white/10 text-secondary hover:text-white hover:border-white/30'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Observaciones generales del pedido..."
                rows={2}
                className="form-input bg-black/40 border border-white/10 rounded-xl resize-none text-sm"
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Acuerdos Comerciales</label>
              <textarea
                value={acuerdosComerciales}
                onChange={e => setAcuerdosComerciales(e.target.value)}
                placeholder="Acuerdos especiales pactados en la negociación..."
                rows={2}
                className="form-input bg-black/40 border border-white/10 rounded-xl resize-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Calculator & Negotiation (1/3) ───────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Negociación */}
          <div className="glass-panel card border border-white/5 p-5 flex flex-col gap-4 sticky top-4">
            <h2 className="text-white font-bold text-sm flex items-center gap-2 border-b border-white/5 pb-3">
              <Calculator size={15} className="text-yellow-400" />
              Negociación y Facturación
            </h2>

            {/* Condición de pago */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">
                Condición de Pago (A% / B%)
              </label>
              <div className="flex flex-col gap-2">
                {CONDICIONES_PAGO.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setCondicionIdx(i)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all flex justify-between items-center ${
                      condicionIdx === i
                        ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400'
                        : 'border-white/10 text-secondary hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>{c.label}</span>
                    {condicionIdx === i && c.pA >= 0 && (
                      <span className="text-[10px] font-black">
                        {c.pA}% A / {c.pB}% B
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom percentages */}
              {condicion.pA === -1 && (
                <div className="flex gap-3 mt-3">
                  <div className="flex-1">
                    <label className="form-label text-[9px] uppercase font-black text-secondary">% Parte A (con IVA)</label>
                    <input
                      type="number" min="0" max="100"
                      value={pctACustom}
                      onChange={e => handlePctAChange(parseInt(e.target.value) || 0)}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-center text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="form-label text-[9px] uppercase font-black text-secondary">% Parte B (sin IVA)</label>
                    <input
                      type="number" min="0" max="100"
                      value={pctBCustom}
                      onChange={e => { setPctBCustom(parseInt(e.target.value) || 0); setPctACustom(100 - (parseInt(e.target.value) || 0)) }}
                      className="form-input bg-black/40 border border-white/10 rounded-xl text-center text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Financiera toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
              <div>
                <p className="text-white text-xs font-bold">Pago por Financiera</p>
                <p className="text-secondary text-[10px]">Recargo del 3% sobre el total</p>
              </div>
              <div
                onClick={() => setAplicaFinanciera(!aplicaFinanciera)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${aplicaFinanciera ? 'bg-orange-400' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${aplicaFinanciera ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>

            {/* Plazos */}
            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Plazos de Pago</label>
              <input
                type="text"
                value={plazosPago}
                onChange={e => setPlazosPago(e.target.value)}
                placeholder="Ej: 30 días / 60 días..."
                className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
              />
            </div>

            {/* ── Resumen financiero ──────────────────────────────────────── */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/30 border border-white/5">
              <p className="text-[10px] font-black uppercase text-secondary tracking-wider mb-1">Resumen del Pedido</p>

              <div className="flex justify-between text-xs">
                <span className="text-secondary">Total Cajas</span>
                <span className="text-white font-bold">{totalCajas} {totalBonus > 0 ? `(+${totalBonus} bonus)` : ''}</span>
              </div>

              <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                <span className="text-secondary">Subtotal (sin IVA)</span>
                <span className="text-white font-bold">{fmt(subtotalSinIVA)}</span>
              </div>

              {pctA > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-blue-400/20 text-blue-400 text-[9px] font-black">A</span>
                    Parte A ({pctA}%)
                  </span>
                  <span className="text-blue-300 font-semibold">{fmt(montoParteA)}</span>
                </div>
              )}

              {pctB > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <span className="px-1 py-0.5 rounded bg-yellow-400/20 text-yellow-400 text-[9px] font-black">B</span>
                    Parte B ({pctB}%)
                  </span>
                  <span className="text-yellow-300 font-semibold">{fmt(montoParteB)}</span>
                </div>
              )}

              {montoIVA > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <Percent size={11} /> IVA 21% (sobre parte A)
                  </span>
                  <span className="text-blue-400 font-bold">+ {fmt(montoIVA)}</span>
                </div>
              )}

              {aplicaFinanciera && (
                <div className="flex justify-between text-xs">
                  <span className="text-secondary flex items-center gap-1">
                    <Banknote size={11} /> Recargo Financiera 3%
                  </span>
                  <span className="text-orange-400 font-bold">+ {fmt(montoFinanciera)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-white/10 pt-2 mt-1">
                <span className="text-white font-black text-sm">TOTAL GENERAL</span>
                <span className="text-primary font-black text-lg">{fmt(totalGeneral)}</span>
              </div>
            </div>

            {/* Warning if price is negotiated */}
            {lineasPedido.some(l => Math.abs(l.precioCajaNegociado - l.producto.precioCaja) > 0.01) && (
              <div className="p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20 text-[10px] text-yellow-400 font-semibold flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Has negociado precios especiales. Este pedido requerirá la aprobación obligatoria de <strong>Gerencia (Nivel 1)</strong>.
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => handleGuardar(false)}
                disabled={submitting}
                className="btn btn-secondary w-full flex items-center justify-center gap-2 text-sm font-bold border border-white/10 hover:border-white/30"
              >
                <Save size={15} />
                {submitting ? 'Guardando...' : 'Guardar Borrador'}
              </button>
              <button
                onClick={() => handleGuardar(true)}
                disabled={submitting}
                className="btn btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-sm font-black"
              >
                <Send size={15} />
                {submitting ? 'Enviando...' : 'Enviar al Supervisor'}
              </button>
            </div>

            {userNivel < 3 && (
              <p className="text-[10px] text-secondary text-center">
                Como Nivel {userNivel}, podés aprobar el pedido directamente
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
