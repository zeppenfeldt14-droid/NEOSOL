import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const empresaId = parseInt(id)
    if (isNaN(empresaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const pedidos = await prisma.pedido.findMany({
      where: { empresaId },
      select: { id: true, numeroPedido: true, estado: true, totalGeneral: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' },
      take: 30
    })

    const facturas = await prisma.factura.findMany({
      where: { pedido: { empresaId } },
      select: { id: true, numeroFactura: true, estado: true, total: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' },
      take: 30
    })

    const cobranzas = await prisma.cobranza.findMany({
      where: { empresaId },
      select: { id: true, montoOriginal: true, estado: true, cuota: true, totalCuotas: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' },
      take: 30
    })

    return NextResponse.json({ pedidos, facturas, cobranzas })
  } catch (error) {
    console.error('Error fetching relaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
