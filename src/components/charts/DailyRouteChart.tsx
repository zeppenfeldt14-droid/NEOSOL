'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { MapPin, MessageCircle, Mail, Phone } from 'lucide-react'

type Props = {
  planificadas: number
  atendidas: number
  reprogramadas: number
  breakdown?: {
    visitas: number
    whatsapp: number
    correo: number
    llamada: number
  }
}

export function DailyRouteChart({ planificadas, atendidas, reprogramadas, breakdown }: Props) {
  const pendientes = planificadas - atendidas - reprogramadas
  
  // 1. Datos para el anillo de progreso puro (Solo Ruta Físca Planificada)
  const routeData = [
    { name: 'Pendientes', value: pendientes > 0 ? pendientes : 0, color: '#4b5563' }, // gris
    { name: 'Atendidas', value: atendidas, color: '#22c55e' },       // verde
    { name: 'Reprogramadas', value: reprogramadas, color: '#f59e0b' } // ambar
  ].filter(d => d.value > 0)

  // Fallback for empty data
  if (routeData.length === 0) {
    routeData.push({ name: 'Sin visitas', value: 1, color: '#374151' })
  }

  // Porcentaje completado (atendidas + reprogramadas)
  const totalRuta = pendientes + atendidas + reprogramadas
  const completadas = atendidas + reprogramadas
  const porcentaje = totalRuta > 0 ? Math.round((completadas / totalRuta) * 100) : 0

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* SECCIÓN SUPERIOR: Gráfico de Progreso */}
      <div style={{ flex: 1, position: 'relative', minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={routeData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {routeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Texto Porcentaje en el centro */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 'bold', color: '#f8fafc', lineHeight: 1 }}>{porcentaje}%</span>
          <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginTop: '2px' }}>Completado</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '1rem' }}>
        {routeData.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></span>
            <span style={{ color: '#9ca3af' }}>{d.name}: {d.value}</span>
          </div>
        ))}
      </div>

      {/* SECCIÓN INFERIOR: Indicadores Extras (Gestión del Día) */}
      {breakdown && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', textAlign: 'center' }}>
            Resumen de Acciones Hoy
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }} title="Visitas">
              <MapPin size={14} color="#3b82f6" style={{ marginBottom: '4px' }} />
              <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '0.875rem' }}>{breakdown.visitas}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }} title="WhatsApp">
              <MessageCircle size={14} color="#22c55e" style={{ marginBottom: '4px' }} />
              <span style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '0.875rem' }}>{breakdown.whatsapp}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(249, 115, 22, 0.2)' }} title="Correos">
              <Mail size={14} color="#f97316" style={{ marginBottom: '4px' }} />
              <span style={{ fontWeight: 'bold', color: '#f97316', fontSize: '0.875rem' }}>{breakdown.correo}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(139, 92, 246, 0.2)' }} title="Llamadas">
              <Phone size={14} color="#8b5cf6" style={{ marginBottom: '4px' }} />
              <span style={{ fontWeight: 'bold', color: '#8b5cf6', fontSize: '0.875rem' }}>{breakdown.llamada}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
