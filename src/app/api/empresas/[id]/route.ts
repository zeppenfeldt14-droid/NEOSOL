import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const empresaId = parseInt(id)
    if (isNaN(empresaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        visitas: { orderBy: { fecha: 'desc' }, take: 10 }
      }
    })

    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    return NextResponse.json(empresa)
  } catch (error: any) {
    console.error('[API GET Empresa ID]', error)
    return NextResponse.json({ error: 'Error al obtener empresa' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const empresaId = parseInt(id)
    if (isNaN(empresaId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const { zona, subZona, vendedorAsignado } = body

    const currentEmpresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    if (!currentEmpresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const updateData: any = {}

    if (zona && zona.trim().toUpperCase() !== (currentEmpresa.zona || '').trim().toUpperCase()) {
      const normalizedZona = zona.trim().toUpperCase()

      // If user is Level 2 and tries to assign to a DIFFERENT zone, they can't do it directly.
      if (session.nivel === 2) {
        return NextResponse.json({ error: 'Nivel 2 no puede reasignar a otra zona directamente. Debe crear una Solicitud de Reasignación.' }, { status: 403 })
      }

      updateData.zona = normalizedZona
      updateData.subZona = subZona || 'SIN ASIGNAR'

      // Auto-assign salesperson of the new zone
      const vendorZona = await prisma.usuario.findFirst({
        where: {
          zona: { equals: normalizedZona, mode: 'insensitive' },
          activo: true,
          NOT: { alias: 'admin' }
        }
      })
      if (vendorZona) {
        updateData.vendedorAsignado = vendorZona.alias
      }
    } else {
      if (subZona !== undefined) updateData.subZona = subZona
      
      // If user is level 2 and tries to change vendor but KEEP the same zone, they can do it.
      if (vendedorAsignado !== undefined) {
        updateData.vendedorAsignado = vendedorAsignado
      }
    }

    const updatedEmpresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: updateData
    })

    if (session) {
      await registrarAccion(
        session.id,
        session.alias,
        'UPDATE_EMPRESA_ZONA',
        `Empresa ID ${empresaId} reasignada a zona: ${updatedEmpresa.zona}`
      )
    }

    return NextResponse.json({ success: true, empresa: updatedEmpresa })
  } catch (error: any) {
    console.error('[API PUT Empresa ID]', error)
    return NextResponse.json({ error: 'Error al actualizar empresa' }, { status: 500 })
  }
}
