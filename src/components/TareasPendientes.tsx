'use client'

import { useState } from 'react'
import { ClipboardList, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import CheckoutVisitaModal from './CheckoutVisitaModal'

type AccionPendiente = {
  id: number
  empresaId: number
  empresaNombre: string
  tipo: string
  descripcion: string | null
}

type AccionCompletadaHoy = {
  id: number
  empresaId: number
  empresaNombre: string
  tipo: string
  descripcion: string | null
  completadaEn: Date | string | null
}

type Props = {
  tareasVisitadas: AccionPendiente[]
  tareasCompletadasHoy: AccionCompletadaHoy[]
  zonaName: string
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bgColor: string; emoji: string }> = {
  visita_programada: { label: 'Registrar Visita', color: '#10b981', bgColor: 'rgba(16,185,129,0.12)', emoji: '🏢' },
  whatsapp:         { label: 'WhatsApp',           color: '#25d366', bgColor: 'rgba(37,211,102,0.12)', emoji: '💬' },
  correo:           { label: 'Correo',             color: '#3b82f6', bgColor: 'rgba(59,130,246,0.12)', emoji: '📧' },
  llamada:          { label: 'Llamada',            color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)', emoji: '📞' },
}

function formatHora(date: Date | string | null) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function TareasPendientes({ tareasVisitadas, tareasCompletadasHoy, zonaName }: Props) {
  const [checkoutAccion, setCheckoutAccion] = useState<AccionPendiente | null>(null)
  const [localVisitadas, setLocalVisitadas] = useState(tareasVisitadas)

  const handleCheckoutClose = () => {
    if (checkoutAccion) setLocalVisitadas(prev => prev.filter(a => a.id !== checkoutAccion.id))
    setCheckoutAccion(null)
  }

  return (
    <>
      {checkoutAccion && (
        <CheckoutVisitaModal
          accionId={checkoutAccion.id}
          empresaId={checkoutAccion.empresaId}
          empresaNombre={checkoutAccion.empresaNombre}
          tipo={checkoutAccion.tipo}
          onClose={handleCheckoutClose}
        />
      )}

      <div style={{ background: 'linear-gradient(135deg, rgba(20,26,46,0.95) 0%, rgba(26,34,64,0.95) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: '300px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={16} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0 }}>Tareas Pendientes</h2>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Gestiones del día</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {localVisitadas.length > 0 && (
              <span style={{ padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                {localVisitadas.length} pendiente{localVisitadas.length !== 1 ? 's' : ''}
              </span>
            )}
            {tareasCompletadasHoy.length > 0 && (
              <span style={{ padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                {tareasCompletadasHoy.length} listas
              </span>
            )}
          </div>
        </div>

        {localVisitadas.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={11} /> Por registrar resultado
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {localVisitadas.map(tarea => {
                const cfg = TIPO_CONFIG[tarea.tipo] || { label: tarea.tipo, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.12)', emoji: '📋' }
                return (
                  <button key={tarea.id} onClick={() => setCheckoutAccion(tarea)}
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '0.6rem 0.75rem', borderRadius: '10px', backgroundColor: cfg.bgColor, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.15s ease', outline: 'none' }}
                    title="Clic para registrar el resultado de la visita">
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{cfg.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tarea.empresaNombre}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.1rem' }}>{cfg.label}{tarea.descripcion ? ` • ${tarea.descripcion}` : ''}</div>
                    </div>
                    <ChevronRight size={14} style={{ color: cfg.color, flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tareasCompletadasHoy.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={11} /> Completadas hoy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {tareasCompletadasHoy.map(tarea => {
                const cfg = TIPO_CONFIG[tarea.tipo] || { label: tarea.tipo, color: '#94a3b8', bgColor: 'rgba(148,163,184,0.08)', emoji: '📋' }
                return (
                  <div key={tarea.id} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.8 }}>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{cfg.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tarea.empresaNombre}</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.05rem' }}>{cfg.label}</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{formatHora(tarea.completadaEn)}</div>
                    <CheckCircle2 size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {localVisitadas.length === 0 && tareasCompletadasHoy.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: '0.5rem', textAlign: 'center', padding: '1rem' }}>
            <ClipboardList size={32} />
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Sin tareas pendientes hoy</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Las visitas marcadas aparecerán aquí para registrar el resultado</p>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href={`/zonas/${zonaName}/planificador`} style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ChevronRight size={12} /> Ver planificador completo
          </Link>
        </div>
      </div>
    </>
  )
}
