import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// ─── GET: Listar cobranzas filtradas por zona/nivel ──────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const zona   = searchParams.get('zona')
    const estado = searchParams.get('estado')

    let zonaFilter: any = {}
    if (session.nivel === 3) {
      zonaFilter = { zona: session.zona }
    } else if (session.nivel === 2) {
      const habilitadas = Array.isArray(session.zonasHabilitadas)
        ? session.zonasHabilitadas
        : JSON.parse(session.zonasHabilitadas || '[]')
      zonaFilter = zona && zona !== 'todas'
        ? { zona }
        : { zona: { in: habilitadas } }
    } else if (zona && zona !== 'todas') {
      zonaFilter = { zona }
    }

    const cobranzas = await prisma.cobranza.findMany({
      where: {
        ...zonaFilter,
        ...(estado && estado !== 'todos' ? { estado } : {}),
      },
      include: {
        pedido: {
          select: {
            numeroPedido: true,
            condicionPago: true,
            plazosPago: true,
          }
        },
        pagos: {
          orderBy: { creadoEn: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { estado: 'asc' },
        { fechaVencimiento: 'asc' },
      ],
    })

    // Enrich with days overdue
    const today = new Date()
    const enriched = cobranzas.map(c => {
      const venc = c.fechaVencimiento ? new Date(c.fechaVencimiento) : null
      const diasAtraso = venc
        ? Math.floor((today.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
        : null
      return { ...c, diasAtraso }
    })

    return NextResponse.json(enriched)
  } catch (error: any) {
    console.error('[API GET Cobranzas]', error)
    return NextResponse.json({ error: 'Error al listar cobranzas.' }, { status: 500 })
  }
}
