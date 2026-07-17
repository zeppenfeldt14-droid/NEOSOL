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
  // Obtener lista de precios activa
  const activeList = await prisma.listaPrecio.findFirst({
    where: { activa: true, vigenteDesde: { lte: new Date() } },
    orderBy: { vigenteDesde: 'desc' },
    include: { precios: true }
  })

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: [{ linea: 'asc' }, { nombre: 'asc' }],
  })

  type Producto = {
    id: number
    codigoInterno: string
    nombre: string
    linea: string
    precioPaquete: number
    paqPorCaja: number
    precioCaja: number
    precioPaqueteMin?: number | null
    precioCajaMin?: number | null
    precioPaqueteMax?: number | null
    precioCajaMax?: number | null
  }

  const productosConPrecios: Producto[] = productos.map((p: any) => {
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

  // Agrupar por línea
  const byLinea: Record<string, typeof productosConPrecios> = {}
  for (const p of productosConPrecios) {
    if (!byLinea[p.linea]) byLinea[p.linea] = []
    byLinea[p.linea].push(p)
  }

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
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍪</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          Lista de Precios
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Neosol S.A. — Galletitas • Vigente al {hoy}
        </p>
        {activeList && (
          <p style={{
            marginTop: '0.75rem', fontSize: '0.8rem', color: '#60a5fa',
            backgroundColor: 'rgba(59,130,246,0.1)', display: 'inline-block',
            padding: '0.25rem 0.75rem', borderRadius: '999px', border: '1px solid rgba(59,130,246,0.3)'
          }}>
            Lista vigente desde {new Date(activeList.vigenteDesde).toLocaleDateString('es-AR')}
          </p>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        {Object.entries(byLinea).map(([linea, prods]) => (
          <div key={linea} style={{ marginBottom: '2rem' }}>
            {/* Cabecera de línea */}
            <div style={{
              backgroundColor: 'rgba(59,130,246,0.1)',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '0 8px 8px 0',
              padding: '0.6rem 1rem',
              marginBottom: '0.75rem'
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {LINEAS[linea] || linea}
              </h2>
            </div>

            {/* Tabla */}
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Código</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Producto</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Paq/Caja</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Precio Paquete</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Precio Caja</th>
                  </tr>
                </thead>
                <tbody>
                  {prods.map((p, i) => (
                    <tr key={p.id} style={{
                      backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {p.codigoInterno}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#e2e8f0' }}>
                        {p.nombre}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                        {p.paqPorCaja}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <span style={{ fontWeight: 600, color: '#34d399' }}>
                          {formatPrice(p.precioPaquete)}
                        </span>
                        {p.precioPaqueteMin && p.precioPaqueteMax && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                            Min: {formatPrice(p.precioPaqueteMin)} / Max: {formatPrice(p.precioPaqueteMax)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                          {formatPrice(p.precioCaja)}
                        </span>
                        {p.precioCajaMin && p.precioCajaMax && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                            Min: {formatPrice(p.precioCajaMin)} / Max: {formatPrice(p.precioCajaMax)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {productosConPrecios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <p>No hay productos disponibles en este momento.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '2rem 0 1rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem' }}>
          <p style={{ color: '#475569', fontSize: '0.8rem' }}>
            Precios en ARS. IVA no incluido. Sujeto a cambios sin previo aviso.
          </p>
          <p style={{ color: '#334155', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            Neosol S.A. — Sistema CRM Interno
          </p>
        </div>
      </div>
    </div>
  )
}
