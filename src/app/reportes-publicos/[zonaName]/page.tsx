import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string) {
  const [d, m, y] = dateStr.split('-')
  if (!d || !m || !y) return dateStr
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ReportesPublicosPage({
  params
}: {
  params: Promise<{ zonaName: string }>
}) {
  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)

  const reportes = await prisma.reporteVisitas.findMany({
    where: { zona: decodedZona },
    orderBy: { creadoEn: 'desc' },
    take: 30
  })

  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1B365D 0%, #0f172a 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '1.5rem 1rem 1.25rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📋</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
            Historial de Reportes
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.85rem' }}>
            Zona: <strong style={{ color: '#60a5fa' }}>{decodedZona}</strong>
          </p>
          <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.2rem' }}>
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
                No hay reportes registrados para esta zona todavía.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {reportes.map((reporte) => {
                let datos: any = null
                try { datos = JSON.parse(reporte.datosJSON) } catch {}

                const visitas: any[] = datos?.visitas || []
                const pendientes: any[] = datos?.pendientes || []

                return (
                  <div key={reporte.id} style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    {/* Cabecera del reporte */}
                    <div style={{
                      backgroundColor: 'rgba(59,130,246,0.08)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      padding: '0.75rem 1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.3 }}>
                            {formatDate(reporte.fecha)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                            {reporte.vendedorAlias}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600,
                            backgroundColor: 'rgba(16,185,129,0.15)',
                            color: '#34d399', padding: '0.2rem 0.5rem',
                            borderRadius: '999px', border: '1px solid rgba(16,185,129,0.3)',
                            whiteSpace: 'nowrap'
                          }}>
                            ✓ {visitas.length} visitas
                          </span>
                          {pendientes.length > 0 && (
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 600,
                              backgroundColor: 'rgba(245,158,11,0.15)',
                              color: '#fbbf24', padding: '0.2rem 0.5rem',
                              borderRadius: '999px', border: '1px solid rgba(245,158,11,0.3)',
                              whiteSpace: 'nowrap'
                            }}>
                              ⏳ {pendientes.length} pendientes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visitas */}
                    {visitas.length > 0 && (
                      <div style={{ padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                          Visitas Realizadas
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {visitas.map((v: any, i: number) => (
                            <div key={i} style={{
                              backgroundColor: 'rgba(16,185,129,0.04)',
                              borderRadius: '8px',
                              padding: '0.5rem 0.75rem',
                              borderLeft: '3px solid rgba(16,185,129,0.4)'
                            }}>
                              <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>
                                {v.empresaNombre}
                              </div>
                              {v.resultado && (
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.15rem', lineHeight: 1.4 }}>
                                  {v.resultado}
                                </div>
                              )}
                              {v.notas && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                                  {v.notas}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pendientes */}
                    {pendientes.length > 0 && (
                      <div style={{
                        padding: '0 1rem 0.75rem',
                        borderTop: visitas.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        paddingTop: visitas.length > 0 ? '0.75rem' : undefined
                      }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                          Tareas Pendientes
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {pendientes.map((p: any, i: number) => (
                            <div key={i} style={{
                              backgroundColor: 'rgba(245,158,11,0.04)',
                              borderRadius: '6px',
                              padding: '0.4rem 0.6rem',
                              borderLeft: '3px solid rgba(245,158,11,0.3)',
                              fontSize: '0.82rem',
                              color: '#cbd5e1',
                              lineHeight: 1.4
                            }}>
                              <strong style={{ color: '#e2e8f0' }}>{p.empresaNombre}</strong>
                              {p.descripcion && <span style={{ color: '#94a3b8' }}> — {p.descripcion}</span>}
                              {p.vencimiento && (
                                <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.1rem' }}>
                                  Vence: {p.vencimiento}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1.5rem' }}>
            <p style={{ color: '#334155', fontSize: '0.72rem' }}>
              Neosol S.A. — Sistema CRM Interno
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
