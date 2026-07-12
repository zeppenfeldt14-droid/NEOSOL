'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Download, ChevronDown, ChevronUp, FileText, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ComisionesMes {
  mes: number
  ventas: number
  cobranzas: number
  facturas: any[]
  pagos: any[]
  vendedores: Record<string, { ventas: number, cobranzas: number, facturas: any[], pagos: any[] }>
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function ComisionesList({ zonaName }: { zonaName: string }) {
  const [data, setData] = useState<ComisionesMes[]>([])
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState<string[]>([])
  const [selectedVendedor, setSelectedVendedor] = useState<string>('todos')
  const [expandedMes, setExpandedMes] = useState<number | null>(null)

  const fetchComisiones = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/zonas/${zonaName}/comisiones`)
      const json = await res.json()
      if (json.comisionesPorMes) {
        setData(json.comisionesPorMes)
        
        // Extraer todos los vendedores únicos
        const vSet = new Set<string>()
        json.comisionesPorMes.forEach((m: ComisionesMes) => {
          Object.keys(m.vendedores).forEach(v => vSet.add(v))
        })
        setVendedores(Array.from(vSet).sort())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [zonaName])

  useEffect(() => {
    fetchComisiones()
  }, [fetchComisiones])

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

  // Filtrado de datos por vendedor
  const mesesFiltrados = data.map(m => {
    if (selectedVendedor === 'todos') {
      return m
    }
    const vData = m.vendedores[selectedVendedor] || { ventas: 0, cobranzas: 0, facturas: [], pagos: [] }
    return {
      mes: m.mes,
      ventas: vData.ventas,
      cobranzas: vData.cobranzas,
      facturas: vData.facturas,
      pagos: vData.pagos,
      vendedores: m.vendedores
    }
  }).filter(m => m.ventas > 0 || m.cobranzas > 0) // Mostrar solo meses con actividad

  // KPIs Acumulados
  const totalVentas = mesesFiltrados.reduce((acc, m) => acc + m.ventas, 0)
  const totalCobranzas = mesesFiltrados.reduce((acc, m) => acc + m.cobranzas, 0)
  const comisionVentas = totalVentas * 0.007
  const comisionCobranzas = totalCobranzas * 0.003
  const totalComisiones = comisionVentas + comisionCobranzas

  const exportPDF = () => {
    const doc = new jsPDF()
    const title = `Comisiones - Zona: ${zonaName} - Vendedor: ${selectedVendedor.toUpperCase()}`
    doc.text(title, 14, 15)

    const tableData = mesesFiltrados.map(m => {
      const cVentas = m.ventas * 0.007
      const cCobranzas = m.cobranzas * 0.003
      return [
        MESES[m.mes],
        fmt(m.ventas),
        fmt(cVentas),
        fmt(m.cobranzas),
        fmt(cCobranzas),
        fmt(cVentas + cCobranzas)
      ]
    })

    // Fila de totales
    tableData.push([
      'TOTAL ACUMULADO',
      fmt(totalVentas),
      fmt(comisionVentas),
      fmt(totalCobranzas),
      fmt(comisionCobranzas),
      fmt(totalComisiones)
    ])

    autoTable(doc, {
      startY: 25,
      head: [['Mes', 'Ventas Brutas', 'Comisión (0.7%)', 'Cobranza', 'Comisión (0.3%)', 'Total Comisiones']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [30, 41, 59], textColor: [255,255,255], fontStyle: 'bold' },
      showFoot: 'lastPage'
    })

    doc.save(`Comisiones_${zonaName}_${selectedVendedor}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-secondary text-sm">Calculando comisiones...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barra superior de herramientas */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center glass-panel card p-4 border border-white/5">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-secondary text-xs font-semibold uppercase tracking-wider">Vendedor:</span>
          <select
            value={selectedVendedor}
            onChange={(e) => setSelectedVendedor(e.target.value)}
            className="bg-[#1a1f2e] text-white text-sm font-bold border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors flex-1"
          >
            <option value="todos">Toda la Zona (Combinado)</option>
            {vendedores.map(v => (
              <option key={v} value={v}>@{v}</option>
            ))}
          </select>
        </div>
        <button onClick={exportPDF} className="btn btn-primary text-xs flex items-center gap-2 border border-primary/50">
          <Download size={14} /> Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel card p-4 border border-white/5 flex flex-col gap-1">
          <span className="text-secondary text-[10px] uppercase font-black tracking-widest">Total Ventas (Base)</span>
          <span className="text-white text-lg font-black">{fmt(totalVentas)}</span>
        </div>
        <div className="glass-panel card p-4 border border-white/5 flex flex-col gap-1">
          <span className="text-secondary text-[10px] uppercase font-black tracking-widest">Total Cobranzas</span>
          <span className="text-white text-lg font-black">{fmt(totalCobranzas)}</span>
        </div>
        <div className="glass-panel card p-4 border border-white/5 flex flex-col gap-1">
          <span className="text-secondary text-[10px] uppercase font-black tracking-widest">Comisiones (Acumulado)</span>
          <span className="text-green-400 text-lg font-black">{fmt(totalComisiones)}</span>
        </div>
        <div className="glass-panel card p-4 border border-white/5 flex flex-col gap-1">
          <span className="text-secondary text-[10px] uppercase font-black tracking-widest">Promedio Mensual</span>
          <span className="text-primary text-lg font-black">{fmt(mesesFiltrados.length > 0 ? totalComisiones / mesesFiltrados.length : 0)}</span>
        </div>
      </div>

      {/* Lista de Comisiones por Mes */}
      <div className="flex flex-col gap-4">
        {mesesFiltrados.length === 0 ? (
          <div className="glass-panel card p-10 text-center border border-white/5 flex flex-col items-center gap-2">
            <DollarSign className="text-white/10" size={40} />
            <p className="text-secondary text-sm font-semibold">No hay comisiones calculadas para este filtro en el año actual.</p>
          </div>
        ) : (
          mesesFiltrados.map((m) => {
            const cVentas = m.ventas * 0.007
            const cCobranzas = m.cobranzas * 0.003
            const total = cVentas + cCobranzas
            const isExpanded = expandedMes === m.mes

            return (
              <div key={m.mes} className="glass-panel card border border-white/5 overflow-hidden transition-all duration-300">
                <div 
                  className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-white/[0.02]"
                  onClick={() => setExpandedMes(isExpanded ? null : m.mes)}
                >
                  <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-primary/20">
                      {m.mes + 1}
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{MESES[m.mes]}</h4>
                      <p className="text-xs text-secondary">{m.facturas.length} Ventas · {m.pagos.length} Cobros</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-8 gap-y-2 flex-1 justify-end md:justify-center">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-black text-secondary tracking-wider">Ventas Brutas</span>
                      <span className="text-white text-xs font-bold">{fmt(m.ventas)}</span>
                      <span className="text-blue-400 text-[10px] font-black mt-0.5">+ {fmt(cVentas)} <span className="opacity-60 font-medium">(0.7%)</span></span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-black text-secondary tracking-wider">Cobranzas</span>
                      <span className="text-white text-xs font-bold">{fmt(m.cobranzas)}</span>
                      <span className="text-yellow-400 text-[10px] font-black mt-0.5">+ {fmt(cCobranzas)} <span className="opacity-60 font-medium">(0.3%)</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-2 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex flex-col items-end bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20">
                      <span className="text-[9px] uppercase font-black text-green-500/70 tracking-widest">Comisión a Pagar</span>
                      <span className="text-green-400 font-black text-lg leading-none mt-1">{fmt(total)}</span>
                    </div>
                    <button className="text-secondary hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/20 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Detalles de Ventas */}
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FileText size={14} className="text-blue-400" />
                          Detalle de Ventas Brutas
                        </h5>
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {m.facturas.length === 0 && <span className="text-xs text-secondary italic">Sin ventas en este mes.</span>}
                          {m.facturas.map((f, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white font-bold">{f.numeroFactura} - {f.pedido?.empresa?.nombre || 'Empresa'}</span>
                                <span className="text-[9px] text-secondary">{new Date(f.creadoEn).toLocaleDateString()} · @{f.pedido?.vendedorAlias}</span>
                              </div>
                              <span className="text-xs font-black text-white">{fmt(f.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detalles de Cobranzas */}
                      <div>
                        <h5 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CheckCircle size={14} className="text-yellow-400" />
                          Detalle de Cobranzas
                        </h5>
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {m.pagos.length === 0 && <span className="text-xs text-secondary italic">Sin cobros en este mes.</span>}
                          {m.pagos.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white font-bold">{p.metodoPago.toUpperCase()} - {p.empresaAsociada}</span>
                                <span className="text-[9px] text-secondary">{new Date(p.creadoEn).toLocaleDateString()} · @{p.vendedorAsociado}</span>
                              </div>
                              <span className="text-xs font-black text-white">{fmt(p.montoFinal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
