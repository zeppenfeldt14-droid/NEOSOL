import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'audit' (gestion) or 'connection' (conexiones)

    // Build query conditions
    const where: any = {}

    // Security scope: Level 2 and 3 can only see their own logs
    if (session.nivel !== 1) {
      where.usuarioId = session.id
    }

    if (type === 'audit') {
      // Management actions
      where.tipoAccion = {
        notIn: ['LOGIN', 'LOGOUT', 'HEARTBEAT', 'FIN_JORNADA', 'AUSENCIA_COMIDA', 'AUSENCIA_BANO', 'AUSENCIA_GESTION', 'AUSENCIA_CURSO']
      }
    } else if (type === 'connection') {
      // Connection actions
      where.tipoAccion = {
        in: ['LOGIN', 'LOGOUT', 'HEARTBEAT', 'FIN_JORNADA', 'AUSENCIA_COMIDA', 'AUSENCIA_BANO', 'AUSENCIA_GESTION', 'AUSENCIA_CURSO']
      }
    }

    const logs = await prisma.logBitacora.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      take: 1000 // Cap to prevent huge responses
    })

    // Map fields to match what the frontend expects
    const formattedLogs = logs.map(l => ({
      id: l.id,
      user_id: l.usuarioId,
      user_name: l.usuarioAlias,
      user_alias: l.usuarioAlias,
      action_type: l.tipoAccion,
      details: l.detalles,
      created_at: l.creadoEn.toISOString()
    }))

    return NextResponse.json(formattedLogs)
  } catch (error: any) {
    console.error('[API GET Logs] Error:', error)
    return NextResponse.json({ error: 'Error al cargar bitácora.' }, { status: 500 })
  }
}
