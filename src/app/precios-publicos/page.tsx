import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const LINEAS: Record<string, string> = {
  pack_individual: 'Línea Pack Individual',
  tripack: 'Línea Tripack',
  minis: 'Línea Minis',
  snacks: 'Línea Snacks Horneados',
}

function formatPrice(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })
}

export default async function PreciosPublicosPage() {
  const activeList = await prisma.listaPrecio.findFirst({
    where: { activa: true, vigenteDesde: { lte: new Date() } },
    orderBy: { vigenteDesde: 'desc' },
    include: { precios: true }
  })

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: [{ linea: 'asc' }, { nombre: 'asc' }],
  })

  const productosConPrecios = productos.map((p: any) => {
    const priceRecord = activeList?.precios.find((pr: any) => pr.productoId === p.id)
    return {
      ...p,
      precioPaquete: p.precioPaquete ?? 0,
      precioCaja: p.precioCaja ?? 0,
      precioPaqueteMin: priceRecord?.precioPaqueteMin ?? p.precioPaqueteMin,
      precioCajaMin: priceRecord?.precioCajaMin ?? p.precioCajaMin,
      precioPaqueteMax: priceRecord?.precioPaqueteMax ?? p.precioPaqueteMax,
      precioCajaMax: priceRecord?.precioCajaMax ?? p.precioCajaMax,
    }
  })

  const byLinea: Record<string, typeof productosConPrecios> = {}
  for (const p of productosConPrecios) {
    if (!byLinea[p.linea]) byLinea[p.linea] = []
    byLinea[p.linea].push(p)
  }

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
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🍪</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
            Lista de Precios
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.85rem' }}>
            Neosol S.A. — Vigente al {hoy}
          </p>
          {activeList && (
            <p style={{
              marginTop: '0.5rem', fontSize: '0.75rem', color: '#60a5fa',
              backgroundColor: 'rgba(59,130,246,0.1)', display: 'inline-block',
              padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(59,130,246,0.3)'
            }}>
              Lista vigente desde {new Date(activeList.vigenteDesde).toLocaleDateString('es-AR')}
            </p>
          )}
        </div>

        {/* Contenido */}
        <div style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto' }}>
          {Object.entries(byLinea).map(([linea, prods]) => (
            <div key={linea} style={{ marginBottom: '1.5rem' }}>
              {/* Cabecera de línea */}
              <div style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderLeft: '4px solid #3b82f6',
                borderRadius: '0 8px 8px 0',
                padding: '0.5rem 0.875rem',
                marginBottom: '0.5rem'
              }}>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {LINEAS[linea] || linea}
                </h2>
              </div>

              {/* Cards en lugar de tabla — mejor para móvil */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {prods.map((p) => (
                  <div key={p.id} style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: '1 1 160px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>{p.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Cód: {p.codigoInterno} · {p.paqPorCaja} paq/caja
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', textAlign: 'right', flexShrink: 0 }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paquete</div>
                        <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                          {formatPrice(p.precioPaquete)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Caja</div>
                        <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.95rem' }}>
                          {formatPrice(p.precioCaja)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {productosConPrecios.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <p>No hay productos disponibles en este momento.</p>
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem' }}>
            <p style={{ color: '#475569', fontSize: '0.75rem' }}>
              Precios en ARS · IVA no incluido · Sujeto a cambios
            </p>
            <p style={{ color: '#334155', fontSize: '0.7rem', marginTop: '0.2rem' }}>
              Neosol S.A. — Sistema CRM Interno
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
