import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const { id } = await params
    const userId = Number(id)

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID de usuario inválido.' }, { status: 400 })
    }

    // Prevent deleting oneself
    if (userId === session.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propio perfil administrador.' }, { status: 400 })
    }

    const userToDelete = await prisma.usuario.findUnique({
      where: { id: userId }
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }

    await prisma.usuario.delete({
      where: { id: userId }
    })

    await registrarAccion(
      session.id,
      session.alias,
      'DELETE_USER',
      `Usuario eliminado: ${userToDelete.nombre} (@${userToDelete.alias})`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API DELETE User] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario.' }, { status: 500 })
  }
}
