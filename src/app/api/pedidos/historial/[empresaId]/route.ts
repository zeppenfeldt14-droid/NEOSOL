import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ empresaId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const empresaId = parseInt(resolvedParams.empresaId, 10)
    if (isNaN(empresaId)) {
      return NextResponse.json({ error: 'ID de empresa inválido' }, { status: 400 })
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: empresaId,
        estado: 'aprobado' // Only show approved orders as history
      },
      include: {
        facturas: true,
        detalles: {
          include: {
            producto: true
          }
        },
        cobranzas: true
      },
      orderBy: {
        creadoEn: 'desc'
      },
      take: 20 // Last 20 sales
    })

    return NextResponse.json(pedidos)
  } catch (error: any) {
    console.error('Historial Pedidos Error:', error)
    return NextResponse.json({ error: 'Error al obtener el historial' }, { status: 500 })
  }
}
