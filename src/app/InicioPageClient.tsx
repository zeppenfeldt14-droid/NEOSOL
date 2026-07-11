'use client'

import { 
  TrendingUp, 
  ShoppingCart, 
  Banknote, 
  Users, 
  MapPin, 
  Activity, 
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react'
import Link from 'next/link'

export function InicioPageClient({ data, currentUser }: { data: any, currentUser: any }) {
  const { kpis, recentActivity, salesDistribution } = data

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(val)
  }

  // Calculate percentages for progress bars
  const pctA = kpis.totalFacturado > 0 ? (salesDistribution.facturadoA / kpis.totalFacturado) * 100 : 0
  const pctB = kpis.totalFacturado > 0 ? (salesDistribution.facturadoB / kpis.totalFacturado) * 100 : 0
  
  const totalCobranzaObj = salesDistribution.facturadoA + salesDistribution.facturadoB
  const pctCobrado = totalCobranzaObj > 0 ? (kpis.totalCobrado / totalCobranzaObj) * 100 : 0

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B132B] overflow-y-auto custom-scrollbar p-8 pb-20">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">INICIO</h1>
          <p className="text-sm text-secondary">Bienvenido al tablero de control y gestión global de KPIs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pedidos" className="btn btn-primary flex items-center gap-2 font-bold shadow-lg shadow-primary/20 text-xs py-2.5">
            <ShoppingCart size={14} />
            <span>Gestionar Pedidos</span>
          </Link>
          <Link href="/ventas" className="btn btn-secondary flex items-center gap-2 text-xs py-2.5">
            <TrendingUp size={14} />
            <span>Ver Ventas</span>
          </Link>
        </div>
      </div>

      {/* METRICAS PRINCIPALES - CARDS GLASSMORPHISM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Facturación */}
        <div className="glass-panel card p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-secondary tracking-widest">Facturación Total</span>
              <h3 className="text-xl font-black text-white mt-1.5 leading-none">{formatMoney(kpis.totalFacturado)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-[11px] text-secondary/70 mt-4 flex items-center gap-1.5 font-medium">
            <span>Mes en curso (Consolidado)</span>
          </div>
        </div>

        {/* Card 2: Cobranzas */}
        <div className="glass-panel card p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-secondary tracking-widest">Cobrado Total</span>
              <h3 className="text-xl font-black text-white mt-1.5 leading-none">{formatMoney(kpis.totalCobrado)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Banknote size={20} />
            </div>
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-4 flex items-center gap-1.5 font-bold">
            <span>{pctCobrado.toFixed(1)}% de efectividad</span>
          </div>
        </div>

        {/* Card 3: Visitas */}
        <div className="glass-panel card p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-secondary tracking-widest">Visitas Registradas</span>
              <h3 className="text-2xl font-black text-white mt-1.5 leading-none">{kpis.visitasMes}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
              <MapPin size={20} />
            </div>
          </div>
          <div className="text-[11px] text-secondary/70 mt-4 flex items-center gap-1.5 font-medium">
            <span>Visitas efectivas de ventas</span>
          </div>
        </div>

        {/* Card 4: Clientes */}
        <div className="glass-panel card p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px] border-white/5 hover:border-white/10 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-secondary tracking-widest">Clientes Totales</span>
              <h3 className="text-xl font-black text-white mt-1.5 leading-none">
                {kpis.clientesActivos} <span className="text-xs text-secondary font-medium">Activos</span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
              <Users size={20} />
            </div>
          </div>
          <div className="text-[11px] text-purple-400 mt-4 flex items-center gap-1.5 font-bold">
            <span>{kpis.clientesProspecto} Prospectos en espera</span>
          </div>
        </div>

      </div>

      {/* DASHBOARD GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda/Centro: Distribución Fiscal y Actividad */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Panel Distribución Fiscal de Ventas */}
          <div className="glass-panel card p-6 border-white/5">
            <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Distribución Fiscal de Ventas</h4>
            
            <div className="space-y-6">
              {/* Barra Facturación A */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-secondary mb-2">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />Factura A (Con IVA 21%)</span>
                  <span className="text-white font-bold">{formatMoney(salesDistribution.facturadoA)} ({pctA.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${pctA}%` }} />
                </div>
              </div>

              {/* Barra Facturación B / Remito */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-secondary mb-2">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />Factura B / Remito / X (Sin IVA)</span>
                  <span className="text-white font-bold">{formatMoney(salesDistribution.facturadoB)} ({pctB.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${pctB}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Panel Últimos Pedidos */}
          <div className="glass-panel card p-6 border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Últimos Pedidos</h4>
              <Link href="/pedidos" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black text-secondary uppercase tracking-widest">
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
                      <td className="py-3 font-bold text-white">{p.numeroPedido}</td>
                      <td className="py-3 text-secondary truncate max-w-[150px]">{p.empresa.nombre}</td>
                      <td className="py-3 text-secondary">{p.zona}</td>
                      <td className="py-3 text-right font-black text-white">{formatMoney(p.totalGeneral)}</td>
                      <td className="py-3 text-center">
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

        {/* Columna Derecha: Bitácora de Visitas Recientes */}
        <div className="lg:col-span-1">
          
          <div className="glass-panel card p-6 border-white/5 h-full flex flex-col">
            <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-wider shrink-0">Visitas Recientes</h4>
            
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 min-h-[300px]">
              {recentActivity.visitas.map((v: any) => (
                <div key={v.id} className="bg-black/25 rounded-2xl p-4 border border-white/5 flex flex-col gap-2 hover:border-white/10 transition-all duration-300">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-bold text-white truncate">{v.empresa.nombre}</span>
                    <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      v.estado === 'completado' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {v.estado}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[10px] text-secondary">
                    <MapPin size={10} className="text-primary" />
                    <span>Zona {v.empresa.zona}</span>
                  </div>
                  
                  <p className="text-[11px] text-secondary/80 leading-relaxed bg-black/15 p-2 rounded-lg italic">
                    "{v.motivo || 'Sin detalles registrados'}"
                  </p>

                  <div className="flex justify-between items-center text-[9px] text-secondary/60 border-t border-white/5 pt-2 mt-1">
                    <span className="flex items-center gap-1"><Clock size={9} /> {new Date(v.fecha).toLocaleDateString()}</span>
                    <span>Vendedor: <b>@{v.empresa.vendedorAsignado}</b></span>
                  </div>
                </div>
              ))}
              
              {recentActivity.visitas.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-secondary/60 italic">
                  No hay visitas registradas
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
