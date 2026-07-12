import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ zonaName: string }> }
) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // In Next.js 15+, params should be awaited
    const { zonaName } = await params

    const currentYear = new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    const facturas = await prisma.factura.findMany({
      where: {
        creadoEn: {
          gte: startOfYear,
          lte: endOfYear
        },
        pedido: {
          zona: zonaName
        },
        estado: {
          not: 'anulada'
        }
      },
      include: {
        pedido: {
          select: {
            vendedorAlias: true,
            numeroPedido: true,
            empresa: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    })

    const pagos = await prisma.pago.findMany({
      where: {
        creadoEn: {
          gte: startOfYear,
          lte: endOfYear
        },
        OR: [
          {
            cobranza: {
              zona: zonaName
            }
          },
          {
            factura: {
              pedido: {
                zona: zonaName
              }
            }
          }
        ]
      },
      include: {
        cobranza: {
          select: {
            vendedorAlias: true,
            empresaNombre: true
          }
        },
        factura: {
          include: {
            pedido: {
              select: {
                vendedorAlias: true,
                empresa: {
                  select: { nombre: true }
                }
              }
            }
          }
        }
      }
    })

    const comisionesPorMes = Array.from({ length: 12 }, (_, i) => ({
      mes: i,
      ventas: 0,
      cobranzas: 0,
      vendedores: {} as Record<string, { ventas: number, cobranzas: number, facturas: any[], pagos: any[] }>,
      facturas: [] as any[],
      pagos: [] as any[]
    }))

    for (const f of facturas) {
      const mes = new Date(f.creadoEn).getMonth()
      const vendedor = f.pedido.vendedorAlias
      
      comisionesPorMes[mes].ventas += f.subtotal
      comisionesPorMes[mes].facturas.push(f)
      
      if (!comisionesPorMes[mes].vendedores[vendedor]) {
        comisionesPorMes[mes].vendedores[vendedor] = { ventas: 0, cobranzas: 0, facturas: [], pagos: [] }
      }
      comisionesPorMes[mes].vendedores[vendedor].ventas += f.subtotal
      comisionesPorMes[mes].vendedores[vendedor].facturas.push(f)
    }

    for (const p of pagos) {
      const mes = new Date(p.creadoEn).getMonth()
      let vendedor = 'Desconocido'
      let empresa = 'Desconocida'

      if (p.cobranza?.vendedorAlias) {
        vendedor = p.cobranza.vendedorAlias
        empresa = p.cobranza.empresaNombre
      } else if (p.factura?.pedido?.vendedorAlias) {
        vendedor = p.factura.pedido.vendedorAlias
        empresa = p.factura.pedido.empresa.nombre
      }

      const pagoAugmented = { ...p, vendedorAsociado: vendedor, empresaAsociada: empresa }

      comisionesPorMes[mes].cobranzas += p.montoFinal
      comisionesPorMes[mes].pagos.push(pagoAugmented)

      if (!comisionesPorMes[mes].vendedores[vendedor]) {
        comisionesPorMes[mes].vendedores[vendedor] = { ventas: 0, cobranzas: 0, facturas: [], pagos: [] }
      }
      comisionesPorMes[mes].vendedores[vendedor].cobranzas += p.montoFinal
      comisionesPorMes[mes].vendedores[vendedor].pagos.push(pagoAugmented)
    }

    return NextResponse.json({ comisionesPorMes })

  } catch (error: any) {
    console.error('Error al obtener comisiones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
