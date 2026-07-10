'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Package, Plus, Pencil, Trash2, Download, Search,
  Save, X, CheckCircle2, AlertCircle, RefreshCw,
  Printer, ChevronDown, ChevronUp, ToggleLeft, ToggleRight
} from 'lucide-react'

interface Producto {
  id: number
  codigoInterno: string
  nombre: string
  linea: string
  precioPaquete: number
  paqPorCaja: number
  precioCaja: number
  activo: boolean
}

interface Props {
  userNivel: number
}

const LINEAS: Record<string, string> = {
  pack_individual: 'Línea Pack Individual',
  tripack:         'Línea Tripack',
  minis:           'Línea Minis',
  snacks:          'Línea Snacks Horneados',
}

const LINEAS_OPTS = Object.entries(LINEAS)
const IVA = 0.21

const EMPTY_FORM = {
  codigoInterno: '', nombre: '', linea: 'pack_individual',
  precioPaquete: '', paqPorCaja: '', precioCaja: '',
}

export function ProductosPageClient({ userNivel }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading]     = useState(true)
  const [seeding, setSeeding]     = useState(false)
  const [search, setSearch]       = useState('')
  const [filtroLinea, setFiltroLinea] = useState<string>('todas')
  const [showInactivos, setShowInactivos] = useState(false)

  // Modal state
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [editTarget, setEditTarget] = useState<Producto | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [msgOk, setMsgOk]     = useState('')
  const [msgErr, setMsgErr]   = useState('')

  const printRef = useRef<HTMLDivElement>(null)

  const fmt = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  // ─── Fetch products ────────────────────────────────────────────────────
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/productos')
    const data = await res.json()
    setProductos(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  // Auto-seed if empty
  useEffect(() => {
    if (!loading && productos.length === 0) {
      handleSeed()
    }
  }, [loading, productos.length])

  // ─── Seed handler ──────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/productos/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) await fetchProductos()
    } finally {
      setSeeding(false)
    }
  }

  // ─── Filter ───────────────────────────────────────────────────────────
  const filtered = productos.filter(p => {
    if (!showInactivos && !p.activo) return false
    if (filtroLinea !== 'todas' && p.linea !== filtroLinea) return false
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase()) &&
        !p.codigoInterno.includes(search)) return false
    return true
  })

  const byLinea = filtered.reduce((acc, p) => {
    const l = p.linea || 'otros'
    if (!acc[l]) acc[l] = []
    acc[l].push(p)
    return acc
  }, {} as Record<string, Producto[]>)

  // ─── Open modals ───────────────────────────────────────────────────────
  const openCrear = () => {
    setForm(EMPTY_FORM)
    setMsgOk(''); setMsgErr('')
    setModal('crear')
  }

  const openEditar = (p: Producto) => {
    setEditTarget(p)
    setForm({
      codigoInterno: p.codigoInterno,
      nombre: p.nombre,
      linea: p.linea,
      precioPaquete: String(p.precioPaquete),
      paqPorCaja: String(p.paqPorCaja),
      precioCaja: String(p.precioCaja),
    })
    setMsgOk(''); setMsgErr('')
    setModal('editar')
  }

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nombre || !form.codigoInterno || !form.precioCaja || !form.paqPorCaja) {
      setMsgErr('Completá todos los campos requeridos.')
      return
    }

    setSaving(true)
    setMsgErr('')
    try {
      const payload = {
        codigoInterno: form.codigoInterno.trim().toUpperCase(),
        nombre: form.nombre.trim().toUpperCase(),
        linea: form.linea,
        precioPaquete: parseFloat(form.precioPaquete) || 0,
        paqPorCaja: parseInt(form.paqPorCaja) || 0,
        precioCaja: parseFloat(form.precioCaja) || 0,
      }

      let res: Response
      if (modal === 'crear') {
        res = await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`/api/productos/${editTarget!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setMsgOk(modal === 'crear' ? 'Producto creado exitosamente.' : 'Producto actualizado.')
      await fetchProductos()
      setTimeout(() => { setModal(null); setMsgOk('') }, 1500)
    } catch (e: any) {
      setMsgErr(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ─── Toggle activo / Soft delete ──────────────────────────────────────
  const toggleActivo = async (p: Producto) => {
    const action = p.activo
      ? (confirm(`¿Desactivar "${p.nombre}"? No aparecerá en nuevos pedidos.`) ? 'DELETE' : null)
      : 'reactivar'
    if (!action) return

    if (action === 'DELETE') {
      await fetch(`/api/productos/${p.id}`, { method: 'DELETE' })
    } else {
      await fetch(`/api/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true }),
      })
    }
    await fetchProductos()
  }

  // ─── PDF Export ────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const today = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    // Build print-friendly HTML
    const productosPorLinea = productos
      .filter(p => p.activo)
      .reduce((acc, p) => {
        const l = p.linea || 'otros'
        if (!acc[l]) acc[l] = []
        acc[l].push(p)
        return acc
      }, {} as Record<string, Producto[]>)

    const tableRows = (prods: Producto[]) =>
      prods.map(p => `
        <tr>
          <td>${p.codigoInterno}</td>
          <td>${p.nombre}</td>
          <td style="text-align:center">${p.paqPorCaja}</td>
          <td style="text-align:right">${fmt(p.precioPaquete)}</td>
          <td style="text-align:right">${fmt(p.precioCaja)}</td>
          <td style="text-align:right">${fmt(p.precioCaja * (1 + IVA))}</td>
        </tr>
      `).join('')

    const sectionsHTML = Object.entries(productosPorLinea).map(([linea, prods]) => `
      <div class="section">
        <div class="section-header">${LINEAS[linea] || linea}</div>
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Descripción</th><th>Paq/Caja</th>
              <th>Precio Paquete</th><th>Precio Caja</th><th>Total c/IVA</th>
            </tr>
          </thead>
          <tbody>${tableRows(prods)}</tbody>
        </table>
      </div>
    `).join('')

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Lista de Precios NEOSOL — ${today}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; font-size: 10px; padding: 20px; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom: 2px solid #6c63ff; padding-bottom:12px; }
          .brand { font-size:22px; font-weight:900; color:#6c63ff; letter-spacing:-0.5px; }
          .brand span { font-size:11px; font-weight:400; color:#666; display:block; margin-top:2px; }
          .date { text-align:right; color:#666; font-size:9px; }
          .date strong { display:block; font-size:13px; color:#1a1a2e; font-weight:800; }
          .section { margin-bottom:16px; }
          .section-header { background:#6c63ff; color:white; font-weight:800; font-size:9px; text-transform:uppercase; letter-spacing:1px; padding:5px 10px; border-radius:4px 4px 0 0; }
          table { width:100%; border-collapse:collapse; font-size:9.5px; }
          thead tr { background:#f0f0f8; }
          th { padding:5px 8px; text-align:left; font-weight:700; font-size:8.5px; text-transform:uppercase; color:#555; letter-spacing:0.5px; }
          td { padding:5px 8px; border-bottom:1px solid #eee; }
          tr:last-child td { border-bottom:none; }
          tr:nth-child(even) td { background:#fafaff; }
          .footer { margin-top:20px; border-top:1px solid #ddd; padding-top:10px; text-align:center; color:#999; font-size:8px; }
          .note { margin-top:10px; font-size:8.5px; color:#888; font-style:italic; }
          @media print { body { padding:10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">NEOSOL<span>Lista de Precios Oficial</span></div>
            <p class="note">* Precios sin IVA. Total c/IVA incluye el 21% sobre precio de caja.</p>
          </div>
          <div class="date">
            Vigente al<br/>
            <strong>${today}</strong>
            <br/>Sujeto a cambios sin previo aviso
          </div>
        </div>
        ${sectionsHTML}
        <div class="footer">
          NEOSOL · Lista de precios generada el ${today} · Uso interno
        </div>
      </body>
      </html>
    `

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { alert('Habilitá las ventanas emergentes para generar el PDF'); return }
    win.document.write(html)
    win.document.close()
    win.onload = () => { win.focus(); win.print() }
  }

  // Auto-calc precio caja cuando cambian paq/precio
  const handleFormChange = (key: string, val: string) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      // Auto-calc precioCaja = precioPaquete * paqPorCaja
      if (key === 'precioPaquete' || key === 'paqPorCaja') {
        const paq = parseFloat(key === 'precioPaquete' ? val : prev.precioPaquete) || 0
        const num = parseInt(key === 'paqPorCaja' ? val : prev.paqPorCaja) || 0
        if (paq > 0 && num > 0) {
          updated.precioCaja = (paq * num).toFixed(2)
        }
      }
      return updated
    })
  }

  const precioPreview = parseFloat(form.precioCaja) || 0

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-primary" size={26} />
            Lista de Precios
          </h1>
          <p className="text-secondary text-sm mt-1">
            Mayo 2026 · {productos.filter(p => p.activo).length} productos activos
            {userNivel === 1 && <span className="text-primary ml-2">· Edición habilitada</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {userNivel === 1 && productos.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn btn-secondary text-xs flex items-center gap-2 border border-white/10"
            >
              <RefreshCw size={13} className={seeding ? 'animate-spin' : ''} />
              {seeding ? 'Cargando...' : 'Cargar Catálogo'}
            </button>
          )}
          {userNivel === 1 && (
            <button
              onClick={openCrear}
              className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/20 font-bold text-sm"
            >
              <Plus size={15} /> Nuevo Producto
            </button>
          )}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-secondary hover:text-white hover:border-white/30 text-xs font-bold transition-all"
          >
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Buscar producto o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input bg-black/40 border border-white/10 rounded-xl pl-9 w-full text-sm py-2"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroLinea('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              filtroLinea === 'todas'
                ? 'bg-primary text-white border-primary'
                : 'border-white/10 text-secondary hover:text-white'
            }`}
          >
            Todas
          </button>
          {LINEAS_OPTS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltroLinea(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filtroLinea === key
                  ? 'bg-primary text-white border-primary'
                  : 'border-white/10 text-secondary hover:text-white'
              }`}
            >
              {label.replace('Línea ', '')}
            </button>
          ))}
        </div>

        {userNivel === 1 && (
          <button
            onClick={() => setShowInactivos(!showInactivos)}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all ${showInactivos ? 'text-primary' : 'text-secondary hover:text-white'}`}
          >
            {showInactivos ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Inactivos
          </button>
        )}
      </div>

      {/* Products by line */}
      {loading || seeding ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-secondary text-sm">{seeding ? 'Cargando catálogo en la base de datos...' : 'Cargando productos...'}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel card border border-white/5 p-16 text-center">
          <Package size={40} className="text-white/10 mx-auto mb-3" />
          <p className="text-secondary font-semibold">No se encontraron productos</p>
          {userNivel === 1 && productos.length === 0 && (
            <p className="text-white/30 text-xs mt-2">Usá el botón &ldquo;Cargar Catálogo&rdquo; para importar los productos del Excel</p>
          )}
        </div>
      ) : (
        Object.entries(byLinea).map(([linea, prods]) => (
          <div key={linea} className="glass-panel card border border-white/5 overflow-hidden">
            {/* Line header */}
            <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-white font-bold text-sm">{LINEAS[linea] || linea}</span>
                <span className="text-secondary text-xs">({prods.length} productos)</span>
              </div>
              <span className="text-secondary text-xs hidden md:block">
                Precio sin IVA · Total c/IVA incluye 21%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    {['Código', 'Descripción', 'Paq/Caja', 'Precio Paquete', 'Precio Caja', 'Total c/IVA 21%', userNivel === 1 ? 'Estado' : '', userNivel === 1 ? 'Acciones' : ''].filter(Boolean).map(col => (
                      <th key={col} className="px-4 py-3 text-[10px] font-black uppercase text-secondary tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prods.map(p => (
                    <tr
                      key={p.id}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${!p.activo ? 'opacity-40' : ''}`}
                    >
                      <td className="px-4 py-3 text-primary font-black text-xs">{p.codigoInterno}</td>
                      <td className="px-4 py-3 text-white font-semibold text-xs">{p.nombre}</td>
                      <td className="px-4 py-3 text-secondary text-xs text-center">{p.paqPorCaja}</td>
                      <td className="px-4 py-3 text-white text-xs">{fmt(p.precioPaquete)}</td>
                      <td className="px-4 py-3 text-white font-bold text-xs">{fmt(p.precioCaja)}</td>
                      <td className="px-4 py-3 text-primary font-black text-xs">{fmt(p.precioCaja * (1 + IVA))}</td>
                      {userNivel === 1 && (
                        <>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              p.activo
                                ? 'bg-green-400/10 text-green-400 border-green-400/20'
                                : 'bg-red-400/10 text-red-400 border-red-400/20'
                            }`}>
                              {p.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEditar(p)}
                                title="Editar"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-secondary hover:text-primary transition-all"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => toggleActivo(p)}
                                title={p.activo ? 'Desactivar' : 'Reactivar'}
                                className={`p-1.5 rounded-lg transition-all ${
                                  p.activo
                                    ? 'bg-white/5 hover:bg-red-400/20 text-secondary hover:text-red-400'
                                    : 'bg-green-400/10 hover:bg-green-400/20 text-green-400'
                                }`}
                              >
                                {p.activo ? <Trash2 size={12} /> : <CheckCircle2 size={12} />}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-white/[0.01]">
                    <td colSpan={userNivel === 1 ? 8 : 6} className="px-4 py-2 text-[10px] text-secondary text-right">
                      IVA: 21% sobre precio de caja · Precios en ARS
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ─── MODAL CREAR / EDITAR ──────────────────────────────────────── */}
      {modal && userNivel === 1 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel card w-full max-w-md border border-white/10 p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 className="font-black text-white flex items-center gap-2">
                <Package size={18} className="text-primary" />
                {modal === 'crear' ? 'Nuevo Producto' : 'Editar Producto'}
              </h3>
              <button onClick={() => setModal(null)} className="text-secondary hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Código Interno *</label>
                <input
                  type="text"
                  value={form.codigoInterno}
                  onChange={e => handleFormChange('codigoInterno', e.target.value)}
                  placeholder="Ej: 33001"
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Línea *</label>
                <select
                  value={form.linea}
                  onChange={e => handleFormChange('linea', e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                >
                  {LINEAS_OPTS.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label text-[10px] uppercase font-black text-secondary">Descripción / Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => handleFormChange('nombre', e.target.value)}
                placeholder="Ej: SANDW. 176 PAQ X 25 GR"
                className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Precio Paq. ($)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.precioPaquete}
                  onChange={e => handleFormChange('precioPaquete', e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Paq/Caja *</label>
                <input
                  type="number" min="1"
                  value={form.paqPorCaja}
                  onChange={e => handleFormChange('paqPorCaja', e.target.value)}
                  className="form-input bg-black/40 border border-white/10 rounded-xl text-sm"
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-[10px] uppercase font-black text-secondary">Precio Caja ($) *</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.precioCaja}
                  onChange={e => handleFormChange('precioCaja', e.target.value)}
                  className={`form-input bg-black/40 border rounded-xl text-sm font-bold ${
                    parseFloat(form.precioPaquete || '0') * parseInt(form.paqPorCaja || '0') === parseFloat(form.precioCaja || '0')
                      ? 'border-green-400/30 text-green-400'
                      : 'border-white/10 text-white'
                  }`}
                />
              </div>
            </div>

            {/* Preview */}
            {precioPreview > 0 && (
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-secondary text-[10px] font-black uppercase">Precio sin IVA</p>
                  <p className="text-white font-black">{fmt(precioPreview)}</p>
                </div>
                <div>
                  <p className="text-secondary text-[10px] font-black uppercase">Total c/IVA 21%</p>
                  <p className="text-primary font-black">{fmt(precioPreview * (1 + IVA))}</p>
                </div>
              </div>
            )}

            {msgErr && (
              <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} /> {msgErr}
              </div>
            )}
            {msgOk && (
              <div className="p-3 rounded-xl bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={14} /> {msgOk}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button onClick={() => setModal(null)} disabled={saving} className="btn btn-secondary text-xs px-5">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary text-xs px-6 shadow-lg shadow-primary/20 font-black flex items-center gap-2"
              >
                <Save size={14} />
                {saving ? 'Guardando...' : (modal === 'crear' ? 'Crear Producto' : 'Guardar Cambios')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
