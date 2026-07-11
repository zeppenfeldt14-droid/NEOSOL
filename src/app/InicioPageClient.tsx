'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  TrendingUp, 
  ShoppingCart, 
  Banknote, 
  Users, 
  Plus,
  ArrowRight,
  Package,
  Calendar,
  ChevronDown,
  Info,
  DollarSign,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Colors for Recharts
const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
const COLOR_PRIMARY = '#3b82f6'
const COLOR_SUCCESS = '#10b981'

export function InicioPageClient({ data, currentUser }: { data: any, currentUser: any }) {
  const { kpis, recentActivity, charts } = data
  const router = useRouter()
  const searchParams = useSearchParams()

  // Dropdown UI state
  const [isOpenFilter, setIsOpenFilter] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Current period values
  const currentPeriodParam = searchParams.get('period') || 'mes'

  // Parse selected months from query param
  const getSelectedMonths = () => {
    if (currentPeriodParam === 'hoy' || currentPeriodParam === 'semana' || currentPeriodParam === 'todo') {
      return []
    }
    if (currentPeriodParam === 'mes') {
      return [new Date().getMonth()]
    }
    return currentPeriodParam.split(',').map(Number).filter(n => !isNaN(n))
  }

  const selectedMonths = getSelectedMonths()

  // Handle clicking outside filter dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpenFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(val)
  }

  // Handle period navigation
  const handleSelectSimplePeriod = (period: 'hoy' | 'semana' | 'todo') => {
    router.push(`/?period=${period}`)
    setIsOpenFilter(false)
  }

  const handleToggleMonth = (monthIndex: number) => {
    let newMonths = [...selectedMonths]
    if (newMonths.includes(monthIndex)) {
      // Don't allow empty selection, fallback to current month if all deselected
      if (newMonths.length > 1) {
        newMonths = newMonths.filter(m => m !== monthIndex)
      }
    } else {
      newMonths.push(monthIndex)
    }
    router.push(`/?period=${newMonths.sort((a, b) => a - b).join(',')}`)
  }

  // Label for the filter button
  const getFilterLabel = () => {
    if (currentPeriodParam === 'hoy') return 'Hoy'
    if (currentPeriodParam === 'semana') return 'Últimos 7 días'
    if (currentPeriodParam === 'todo') return 'Historial completo'
    if (currentPeriodParam === 'mes') return `Mes: ${MONTH_NAMES[new Date().getMonth()]}`
    
    if (selectedMonths.length === 1) {
      return `Mes: ${MONTH_NAMES[selectedMonths[0]]}`
    }
    if (selectedMonths.length === 3) {
      return `${selectedMonths.map(m => MONTH_NAMES[m].substring(0, 3)).join(' + ')} (Trimestre)`
    }
    return `${selectedMonths.length} Meses seleccionados`
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B132B] overflow-y-auto custom-scrollbar p-8 pb-24">
      
      {/* CABECERA CON FILTRO SELECT MÚLTIPLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">INICIO</h1>
          <p className="text-sm text-secondary">Bienvenido al tablero de control y gestión global de KPIs.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dropdown de Filtro Multiselección */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsOpenFilter(!isOpenFilter)}
              className="btn btn-secondary text-xs flex items-center gap-2 border border-white/10 px-4 py-2.5 bg-black/40 hover:bg-white/10 text-white rounded-lg transition-all"
            >
              <Calendar size={14} className="text-primary" />
              <span>{getFilterLabel()}</span>
              <ChevronDown size={12} className="text-secondary" />
            </button>

            {isOpenFilter && (
              <div className="absolute right-0 mt-2 w-72 bg-[#121b36] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 animate-fade-in">
                <div className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Períodos Simples</div>
                <div className="flex flex-col gap-1 mb-4">
                  <button 
                    onClick={() => handleSelectSimplePeriod('hoy')}
                    className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${currentPeriodParam === 'hoy' ? 'bg-primary text-white' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                  >
                    Hoy
                  </button>
                  <button 
                    onClick={() => handleSelectSimplePeriod('semana')}
                    className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${currentPeriodParam === 'semana' ? 'bg-primary text-white' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                  >
                    Últimos 7 días
                  </button>
                  <button 
                    onClick={() => handleSelectSimplePeriod('todo')}
                    className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${currentPeriodParam === 'todo' ? 'bg-primary text-white' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                  >
                    Historial Completo (Todo)
                  </button>
                </div>

                <div className="border-t border-white/5 my-2 pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">Meses del Año (Selección Múltiple)</span>
                    {selectedMonths.length > 1 && (
                      <button 
                        onClick={() => router.push('/?period=mes')}
                        className="text-[9px] font-bold text-red-400 hover:underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  
                  {/* Grid de Meses con Checkboxes */}
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {MONTH_NAMES.map((name, index) => {
                      const isChecked = selectedMonths.includes(index)
                      return (
                        <label 
                          key={index} 
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'border-white/5 bg-black/25 text-secondary hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            className="rounded bg-black/40 border-white/10 text-primary focus:ring-0 focus:ring-offset-0"
                            checked={isChecked}
                            onChange={() => handleToggleMonth(index)}
                          />
                          <span>{name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/pedidos/nuevo" className="btn btn-primary flex items-center gap-2 font-bold shadow-lg shadow-primary/20 text-xs py-2.5">
            <Plus size={14} />
            <span>Nuevo Pedido</span>
          </Link>
        </div>
      </div>

      {/* METRICAS PRINCIPALES - 5 CUBOS EN UNA SOLA LÍNEA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        
        {/* Cubo 1: Facturación */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Facturación Total</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">{formatMoney(kpis.totalFacturado)}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-[10px] text-secondary/60 mt-3 font-medium">Consolidado ventas</div>
        </div>

        {/* Cubo 2: Cobranzas Cobrado */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Total Cobrado</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">{formatMoney(kpis.totalCobrado)}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Banknote size={16} />
            </div>
          </div>
          <div className="text-[10px] text-emerald-400 mt-3 font-bold">Cobros registrados</div>
        </div>

        {/* Cubo 3: Cobranza Pendiente (NUEVO) */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Cobranza Pendiente</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">{formatMoney(kpis.cobranzaPendiente)}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-[10px] text-rose-400 mt-3 font-bold">Saldos pendientes</div>
        </div>

        {/* Cubo 4: Cajas Vendidas (REEMPLAZA A VISITAS) */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Cajas Vendidas</span>
              <h3 className="text-xl font-black text-white mt-1 leading-none">{kpis.cajasVendidas}</h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
              <Package size={16} />
            </div>
          </div>
          <div className="text-[10px] text-secondary/60 mt-3 font-medium">Volumen despachado</div>
        </div>

        {/* Cubo 5: Clientes */}
        <div className="glass-panel card p-5 relative overflow-hidden flex flex-col justify-between min-h-[110px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-secondary tracking-widest">Clientes Activos</span>
              <h3 className="text-lg font-black text-white mt-1 leading-none">
                {kpis.clientesActivos} <span className="text-xs text-secondary font-medium">Activos</span>
              </h3>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Users size={16} />
            </div>
          </div>
          <div className="text-[10px] text-purple-400 mt-3 font-bold">
            {kpis.clientesProspecto} Prospectos
          </div>
        </div>

      </div>

      {/* SECCIÓN DE GRÁFICOS (3 EN UNA LÍNEA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Gráfico 1: Productos Vendidos (Pie Chart) */}
        <div className="glass-panel card p-6 border-white/5 flex flex-col justify-between min-h-[350px]">
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Productos más vendidos (Cajas)
          </h4>
          <div className="flex-1 min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.productos}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {charts.productos.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Leyenda */}
          <div className="flex flex-wrap gap-2 text-[10px] justify-center mt-2 border-t border-white/5 pt-3">
            {charts.productos.map((p: any, i: number) => (
              <span key={p.name} className="flex items-center gap-1 text-secondary font-medium">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS_PIE[i % COLORS_PIE.length] }} />
                <span className="truncate max-w-[80px]">{p.name}</span> ({p.value})
              </span>
            ))}
            {charts.productos.length === 0 && (
              <span className="text-secondary/50 italic">Sin datos de productos</span>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ventas por Zona (Vertical Bar Chart) */}
        <div className="glass-panel card p-6 border-white/5 flex flex-col justify-between min-h-[350px]">
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> Ventas Totales por Zona
          </h4>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.zonas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="zone" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip 
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="sales" fill={COLOR_PRIMARY} radius={[4, 4, 0, 0]}>
                  {charts.zonas.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.sales > 2000000 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Cobros del Mes por Método (Horizontal Bar Chart) */}
        <div className="glass-panel card p-6 border-white/5 flex flex-col justify-between min-h-[350px]">
          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" /> Cobrado del Mes por Método
          </h4>
          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={charts.metodos} 
                layout="vertical"
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis dataKey="method" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip 
                  formatter={(value) => formatMoney(Number(value))}
                  contentStyle={{ backgroundColor: '#121b36', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="amount" fill={COLOR_SUCCESS} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR: ÚLTIMOS PEDIDOS & VENTAS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda/Centro: Últimos Pedidos */}
        <div className="lg:col-span-2">
          <div className="glass-panel card p-6 border-white/5 h-full">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Últimos Pedidos</h4>
              <Link href="/pedidos" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-secondary uppercase tracking-widest">
                    <th className="pb-3">Nº Pedido</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Zona</th>
                    <th className="pb-3 text-right">Monto</th>
                    <th className="pb-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {recentActivity.pedidos.map((p: any) => (
                    <tr key={p.id} className="text-xs hover:bg-white/[0.01]">
                      <td className="py-3.5 font-bold text-white">{p.numeroPedido}</td>
                      <td className="py-3.5 text-secondary truncate max-w-[180px]">{p.empresa.nombre}</td>
                      <td className="py-3.5 text-secondary">{p.zona}</td>
                      <td className="py-3.5 text-right font-black text-white">{formatMoney(p.totalGeneral)}</td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                          p.estado === 'aprobado' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          p.estado === 'borrador' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {p.estado.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentActivity.pedidos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-secondary/60 italic">No hay pedidos registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ventas Recientes */}
        <div className="lg:col-span-1">
          <div className="glass-panel card p-6 border-white/5 h-full flex flex-col">
            <h4 className="text-xs font-black text-white mb-6 uppercase tracking-wider shrink-0">Ventas Recientes (Facturas)</h4>
            
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 min-h-[300px]">
              {recentActivity.ventas.map((v: any) => (
                <div key={v.id} className="bg-black/25 rounded-2xl p-4 border border-white/5 flex flex-col gap-2 hover:border-white/10 transition-all duration-300">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-white truncate">{v.pedido.empresa.nombre}</span>
                    <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      v.tipo === 'A' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                      'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'
                    }`}>
                      FAC-{v.tipo}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-secondary/60 font-medium">{v.numeroFactura}</span>
                    <span className="font-black text-white">{formatMoney(v.total)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-secondary/60 border-t border-white/5 pt-2 mt-1">
                    <span className="flex items-center gap-1"><Clock size={9} /> {new Date(v.creadoEn).toLocaleDateString()}</span>
                    <span>Vendedor: <b>@{v.pedido.vendedorAlias}</b></span>
                  </div>
                </div>
              ))}
              
              {recentActivity.ventas.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-secondary/60 italic">
                  No hay ventas registradas
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
