'use client'

import React, { useState } from 'react'
import { AlertTriangle, Clock, RefreshCw, DollarSign, X, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { PredictiveAlert } from '@/lib/alertsEngine'

interface AlertsDashboardProps {
  alerts: PredictiveAlert[]
  zonaName: string
}

export function AlertsDashboard({ alerts, zonaName }: AlertsDashboardProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<PredictiveAlert[]>(alerts)

  if (visibleAlerts.length === 0) return null

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'seguimiento_pendiente': return <Clock className="text-yellow-500" size={24} />
      case 'quiebre_stock': return <AlertTriangle className="text-red-500" size={24} />
      case 'alerta_cobranza': return <DollarSign className="text-orange-500" size={24} />
      case 'oportunidad_reactivacion': return <RefreshCw className="text-blue-500" size={24} />
      default: return <AlertCircle className="text-gray-400" size={24} />
    }
  }

  const getAlertColorClasses = (severidad: string) => {
    switch (severidad) {
      case 'amarillo': return 'border-yellow-500/50 bg-yellow-500/10'
      case 'rojo': return 'border-red-500/50 bg-red-500/10'
      case 'naranja': return 'border-orange-500/50 bg-orange-500/10'
      case 'azul': return 'border-blue-500/50 bg-blue-500/10'
      default: return 'border-gray-500/50 bg-gray-500/10'
    }
  }

  const handleDismiss = (id: string) => {
    setVisibleAlerts(prev => prev.filter(a => a.id !== id))
    // Here we could call an API to mark it as dismissed in the future if we persist them
  }

  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertCircle className="text-accent" /> Centro de Inteligencia
          <span className="badge badge-danger text-xs">{visibleAlerts.length}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleAlerts.map((alert) => (
          <div 
            key={alert.id}
            className={`relative rounded-xl border p-4 backdrop-blur-md shadow-lg flex flex-col gap-3 transition-all hover:-translate-y-1 ${getAlertColorClasses(alert.nivelSeveridad)}`}
            style={{ minHeight: '140px' }}
          >
            <button 
              onClick={() => handleDismiss(alert.id)}
              className="absolute top-2 right-2 p-1 hover:bg-black/20 rounded-full transition-colors"
              title="Ocultar alerta"
            >
              <X size={16} className="opacity-70 hover:opacity-100" />
            </button>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-black/20 rounded-lg shrink-0">
                {getAlertIcon(alert.tipo)}
              </div>
              <div>
                <Link href={`/zonas/${zonaName}/empresas/${alert.empresaId}`} className="font-semibold text-lg hover:underline decoration-white/50">
                  {alert.empresaNombre}
                </Link>
                <p className="text-sm opacity-90 mt-1 leading-tight">
                  {alert.mensaje}
                </p>
              </div>
            </div>

            <div className="mt-auto flex gap-2">
              <Link 
                href={`/zonas/${zonaName}/empresas/${alert.empresaId}`} 
                className="flex-1 bg-white/10 hover:bg-white/20 text-center py-2 rounded-lg text-sm font-medium transition-colors border border-white/10 flex items-center justify-center gap-1"
              >
                Atender <ChevronRight size={16} />
              </Link>
            </div>
            
            {(alert.escaladaNivel1 || alert.escaladaNivel2) && (
              <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={10} />
                Escalada
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
