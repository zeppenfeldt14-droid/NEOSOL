import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const zonaParam = searchParams.get('zona')

    const filters: any = {
      estado: 'activo'
    }

    if (zonaParam) {
      filters.zona = zonaParam
    } else if (user.nivel === 3) {
      filters.zona = user.zona || 'CABA'
    } else if (user.nivel === 2) {
      const authZones = Array.isArray(user.zonasHabilitadas)
        ? user.zonasHabilitadas
        : typeof user.zonasHabilitadas === 'string'
        ? JSON.parse(user.zonasHabilitadas)
        : []
      if (authZones.length > 0) {
        filters.zona = { in: authZones }
      }
    }

    const empresas = await prisma.empresa.findMany({
      where: filters,
      select: {
        id: true,
        nombre: true,
        cuit: true,
        telefono: true,
        zona: true,
        vendedorAsignado: true,
        estado: true,
        barrio: true,
        direccion: true
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json(empresas)
  } catch (error: any) {
    console.error('API /empresas/clientes Error:', error)
    return NextResponse.json({ error: 'Error al obtener clientes activos' }, { status: 500 })
  }
}
