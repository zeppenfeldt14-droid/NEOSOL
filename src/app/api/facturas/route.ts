import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// ─── GET: Listar facturas ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')

    // Build zone filter via Pedido relation
    let pedidoZonaFilter: any = {}
    if (session.nivel === 3) {
      pedidoZonaFilter = { pedido: { zona: session.zona } }
    } else if (zona && zona !== 'todas') {
      pedidoZonaFilter = { pedido: { zona } }
    }

    const facturas = await prisma.factura.findMany({
      where: pedidoZonaFilter,
      include: {
        pedido: {
          select: {
            numeroPedido: true,
            zona: true,
            vendedorAlias: true,
            empresa: { select: { nombre: true } },
          }
        },
        pagos: true,
      },
      orderBy: { creadoEn: 'desc' },
    })

    return NextResponse.json(facturas)
  } catch (error: any) {
    console.error('[API GET Facturas]', error)
    return NextResponse.json({ error: 'Error al listar facturas.' }, { status: 500 })
  }
}
