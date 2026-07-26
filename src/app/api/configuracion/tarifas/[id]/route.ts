import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de lista inválido.' }, { status: 400 })
    }

    const body = await request.json()
    const { nombre, minimoCajas, limiteListaA, usuariosHabilitados } = body

    const updateData: any = {}
    if (nombre !== undefined) updateData.nombre = nombre
    if (minimoCajas !== undefined) updateData.minimoCajas = minimoCajas
    if (limiteListaA !== undefined) updateData.limiteListaA = limiteListaA
    if (usuariosHabilitados !== undefined) updateData.usuariosHabilitados = usuariosHabilitados

    const updated = await prisma.listaPrecio.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, lista: updated })
  } catch (error: any) {
    console.error('[API PUT Tarifas/ID]', error)
    return NextResponse.json({ error: 'Error al actualizar la lista de precios.' }, { status: 500 })
  }
}
