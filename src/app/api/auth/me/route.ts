import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ success: false, user: null })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.id }
    })

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ success: false, user: null })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        alias: usuario.alias,
        email: usuario.email,
        nivel: usuario.nivel,
        rol: usuario.rol,
        foto: usuario.foto,
        modulos: usuario.modulos,
        mustChangePassword: usuario.mustChangePassword
      }
    })
  } catch (error: any) {
    console.error('[API Auth Me] Error:', error)
    return NextResponse.json(
      { error: 'Error al verificar sesión.' },
      { status: 500 }
    )
  }
}
