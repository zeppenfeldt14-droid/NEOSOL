import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string) {
  // dateStr format: DD-MM-YYYY
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '0'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B365D 0%, #0f172a 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '2rem 1.5rem 1.5rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          Historial de Reportes
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Zona: <strong style={{ color: '#60a5fa' }}>{decodedZona}</strong> — Actualizado al {hoy}
        </p>
      </div>

      {/* Contenido */}
      <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        {reportes.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <p style={{ color: '#64748b', fontSize: '1rem' }}>No hay reportes registrados para esta zona todavía.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    padding: '0.875rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                        {formatDate(reporte.fecha)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        {reporte.vendedorAlias}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: 'rgba(16,185,129,0.15)',
                        color: '#34d399', padding: '0.25rem 0.6rem',
                        borderRadius: '999px', border: '1px solid rgba(16,185,129,0.3)'
                      }}>
                        {visitas.length} visitas
                      </span>
                      {pendientes.length > 0 && (
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: 'rgba(245,158,11,0.15)',
                          color: '#fbbf24', padding: '0.25rem 0.6rem',
                          borderRadius: '999px', border: '1px solid rgba(245,158,11,0.3)'
                        }}>
                          {pendientes.length} pendientes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visitas del día */}
                  {visitas.length > 0 && (
                    <div style={{ padding: '1rem 1.25rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                        Visitas Realizadas
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {visitas.map((v: any, i: number) => (
                          <div key={i} style={{
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            padding: '0.6rem 0.875rem',
                            borderLeft: '3px solid rgba(16,185,129,0.4)'
                          }}>
                            <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                              {v.empresaNombre}
                            </div>
                            {v.resultado && (
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                {v.resultado}
                              </div>
                            )}
                            {v.notas && (
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem', fontStyle: 'italic' }}>
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
                    <div style={{ padding: '0 1.25rem 1rem', borderTop: visitas.length > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingTop: visitas.length > 0 ? '1rem' : undefined }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                        Tareas Pendientes
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {pendientes.map((p: any, i: number) => (
                          <div key={i} style={{
                            backgroundColor: 'rgba(245,158,11,0.04)',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            borderLeft: '3px solid rgba(245,158,11,0.3)',
                            fontSize: '0.85rem',
                            color: '#cbd5e1'
                          }}>
                            <strong style={{ color: '#e2e8f0' }}>{p.empresaNombre}</strong>
                            {p.descripcion && <span style={{ color: '#94a3b8' }}> — {p.descripcion}</span>}
                            {p.vencimiento && (
                              <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '0.5rem' }}>
                                Vence: {p.vencimiento}
                              </span>
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

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '2rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1.5rem' }}>
          <p style={{ color: '#334155', fontSize: '0.75rem' }}>
            Neosol S.A. — Sistema CRM Interno
          </p>
        </div>
      </div>
    </div>
  )
}
