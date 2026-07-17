'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Calendar, MapPin, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'

interface Visita {
  id: number
  empresaNombre: string
  direccion: string | null
  barrio: string | null
  resultado: string
  contacto: string | null
  notas: string | null
  proximaAccion: string | null
}

interface Pendiente {
  id: number
  empresaNombre: string
  descripcion: string | null
  vencimiento: string
  completada: boolean
}

interface Reporte {
  id: string
  fecha: string
  vendedorAlias: string
  visitas: Visita[]
  pendientes: Pendiente[]
}

interface Props {
  reportes: Reporte[]
  zonaName: string
}

function formatDateHeader(dateStr: string) {
  // dateStr is 'DD-MM-YYYY'
  const [d, m, y] = dateStr.split('-')
  if (!d || !m || !y) return dateStr
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ReportesPublicosClient({ reportes, zonaName }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      padding: '0 0 3rem'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B365D 0%, #0f172a 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '2rem 1rem 1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📋</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
          Historial de Reportes
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.85rem' }}>
          Zona: <strong style={{ color: '#60a5fa' }}>{zonaName}</strong>
        </p>
        <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.2rem' }}>
          Actualizado al {hoy}
        </p>
      </div>

      {/* Contenido */}
      <div style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto' }}>
        {reportes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 1rem',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginTop: '1rem'
          }}>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              No se registraron visitas ni reportes para esta zona todavía.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reportes.map((reporte) => {
              const isExpanded = expandedId === reporte.id
              const totalVisitas = reporte.visitas.length
              const totalPendientes = reporte.pendientes.length

              return (
                <div key={reporte.id} style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: isExpanded ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.2s'
                }}>
                  {/* Cabecera del Reporte (Clickable Accordion Trigger) */}
                  <div
                    onClick={() => toggleExpand(reporte.id)}
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ flex: '1 1 auto', marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: 700, color: isExpanded ? '#60a5fa' : '#e2e8f0', fontSize: '0.88rem', textTransform: 'capitalize' }}>
                        {formatDateHeader(reporte.fecha)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Prev: {reporte.vendedorAlias} · {totalVisitas} {totalVisitas === 1 ? 'visita' : 'visitas'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#34d399', padding: '0.15rem 0.45rem',
                          borderRadius: '999px', border: '1px solid rgba(16, 185, 129, 0.25)',
                          whiteSpace: 'nowrap'
                        }}>
                          {totalVisitas} Visitas
                        </span>
                        {totalPendientes > 0 && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#fbbf24', padding: '0.15rem 0.45rem',
                            borderRadius: '999px', border: '1px solid rgba(245, 158, 11, 0.25)',
                            whiteSpace: 'nowrap'
                          }}>
                            {totalPendientes} Tareas
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: '#60a5fa' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
                    </div>
                  </div>

                  {/* Cuerpo Desplegable (Accordion Content) */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: 'rgba(0,0,0,0.1)'
                    }}>
                      {/* Visitas */}
                      {totalVisitas > 0 && (
                        <div style={{ padding: '0.85rem 1rem' }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>
                            Visitas Realizadas
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {reporte.visitas.map((v, i) => (
                              <div key={v.id} style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.03)',
                                borderRadius: '8px',
                                padding: '0.55rem 0.75rem',
                                borderLeft: '3px solid rgba(16, 185, 129, 0.4)'
                              }}>
                                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <Building2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                                  <span>{v.empresaNombre}</span>
                                </div>
                                {v.direccion && (
                                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                                    {v.direccion} {v.barrio ? `· ${v.barrio}` : ''}
                                  </div>
                                )}
                                {v.resultado && (
                                  <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '0.3rem', lineHeight: 1.35 }}>
                                    <strong>Resultado:</strong> {v.resultado}
                                  </div>
                                )}
                                {v.notas && (
                                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem', fontStyle: 'italic', lineHeight: 1.35 }}>
                                    "{v.notas}"
                                  </div>
                                )}
                                {v.proximaAccion && (
                                  <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ fontWeight: 600 }}>Próxima Acción:</span> {v.proximaAccion}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pendientes */}
                      {totalPendientes > 0 && (
                        <div style={{
                          padding: '0 1rem 0.85rem',
                          borderTop: totalVisitas > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          paddingTop: totalVisitas > 0 ? '0.85rem' : undefined
                        }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.45rem' }}>
                            Tareas Pendientes / Agendadas
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {reporte.pendientes.map((p) => (
                              <div key={p.id} style={{
                                backgroundColor: p.completada ? 'rgba(16, 185, 129, 0.02)' : 'rgba(245, 158, 11, 0.03)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.65rem',
                                borderLeft: p.completada ? '3px solid rgba(16, 185, 129, 0.3)' : '3px solid rgba(245, 158, 11, 0.3)',
                                fontSize: '0.78rem',
                                color: '#cbd5e1',
                                lineHeight: 1.35
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.empresaNombre}</span>
                                  <span style={{ fontSize: '0.65rem', color: p.completada ? '#34d399' : '#fbbf24' }}>
                                    {p.completada ? 'Completada' : 'Pendiente'}
                                  </span>
                                </div>
                                {p.descripcion && (
                                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                    {p.descripcion}
                                  </div>
                                )}
                                {p.vencimiento && (
                                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                    Agendado: {p.vencimiento}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1.5rem' }}>
          <p style={{ color: '#334155', fontSize: '0.68rem' }}>
            Neosol S.A. — Sistema CRM Interno
          </p>
        </div>
      </div>
    </div>
  )
}
