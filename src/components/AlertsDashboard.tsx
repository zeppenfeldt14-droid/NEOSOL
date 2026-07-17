'use client'

import React, { useState } from 'react'
import { AlertTriangle, Clock, RefreshCw, DollarSign, X, ChevronRight, AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { PredictiveAlert } from '@/lib/alertsEngine'

interface AlertsDashboardProps {
  alerts: PredictiveAlert[]
  zonaName: string
}

export function AlertsDashboard({ alerts, zonaName }: AlertsDashboardProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<PredictiveAlert[]>(alerts)
  const [showAll, setShowAll] = useState(false)

  if (visibleAlerts.length === 0) return null

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'seguimiento_pendiente': return <Clock className="text-yellow-400" size={20} />
      case 'quiebre_stock': return <AlertTriangle className="text-red-400" size={20} />
      case 'alerta_cobranza': return <DollarSign className="text-orange-400" size={20} />
      case 'oportunidad_reactivacion': return <RefreshCw className="text-blue-400" size={20} />
      default: return <AlertCircle className="text-gray-400" size={20} />
    }
  }

  const getAlertColorClasses = (severidad: string) => {
    switch (severidad) {
      case 'amarillo': return 'border-yellow-500/30 bg-yellow-950/40 text-yellow-100'
      case 'rojo': return 'border-red-500/30 bg-red-950/40 text-red-100'
      case 'naranja': return 'border-orange-500/30 bg-orange-950/40 text-orange-100'
      case 'azul': return 'border-blue-500/30 bg-blue-950/40 text-blue-100'
      default: return 'border-gray-500/30 bg-gray-900/40 text-gray-100'
    }
  }

  const handleDismiss = (id: string) => {
    setVisibleAlerts(prev => prev.filter(a => a.id !== id))
  }

  const displayedAlerts = showAll ? visibleAlerts : visibleAlerts.slice(0, 3)

  return (
    <div className="mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <AlertCircle className="text-accent" size={20} /> Alertas de Inteligencia
          <span className="badge badge-danger text-xs px-2 py-0.5 rounded-full">{visibleAlerts.length}</span>
        </h2>
        
        {visibleAlerts.length > 3 && (
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAll ? 'Ver menos' : `Ver todas (${visibleAlerts.length})`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {displayedAlerts.map((alert) => (
          <div 
            key={alert.id}
            className={`relative rounded-lg border p-3 backdrop-blur-md shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all ${getAlertColorClasses(alert.nivelSeveridad)}`}
          >
            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 min-w-0 w-full">
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-1.5 bg-black/30 rounded-md shrink-0">
                  {getAlertIcon(alert.tipo)}
                </div>
                {(alert.escaladaNivel1 || alert.escaladaNivel2) && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded shrink-0">
                    Escalada
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                <div className="flex items-center gap-2">
                  <Link href={`/zonas/${zonaName}/empresas/${alert.empresaId}`} className="font-semibold truncate hover:underline">
                    {alert.empresaNombre}
                  </Link>
                  <span className="text-xs opacity-70 hidden md:inline truncate">- {alert.mensaje}</span>
                </div>
                
                {alert.accionRecomendada && (
                  <p className="text-sm mt-0.5 opacity-90 flex items-center gap-1.5">
                    <span className="text-lg leading-none">👉</span> {alert.accionRecomendada}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
              <Link 
                href={`/zonas/${zonaName}/empresas/${alert.empresaId}`} 
                className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-white/10 flex items-center justify-center gap-1 whitespace-nowrap"
              >
                Atender <ChevronRight size={16} />
              </Link>
              <button 
                onClick={() => handleDismiss(alert.id)}
                className="p-1.5 bg-black/20 hover:bg-black/40 rounded-md transition-colors"
                title="Ocultar temporalmente"
              >
                <X size={16} className="opacity-70 hover:opacity-100" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 bg-white/5 p-2 rounded border border-white/5">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-400" />
        <p>Las alertas desaparecen automáticamente cuando registras una nueva visita, nota o actualización en el perfil del cliente.</p>
      </div>
    </div>
  )
}
