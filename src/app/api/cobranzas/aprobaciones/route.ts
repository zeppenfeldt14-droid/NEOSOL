import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    if (session.nivel > 2) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    // Find all pending collection approval requests
    const solicitudes = await prisma.solicitudEliminacion.findMany({
      where: {
        tipo: {
          in: ['VENCIMIENTO_COBRANZA', 'PAGO_COBRANZA', 'CUOTAS_COBRANZA']
        },
        estado: 'pendiente'
      },
      orderBy: { creadoEn: 'desc' }
    })

    return NextResponse.json(solicitudes)
  } catch (error: any) {
    console.error('[API GET Aprobaciones Cobranza]', error)
    return NextResponse.json({ error: error.message || 'Error de servidor.' }, { status: 500 })
  }
}
