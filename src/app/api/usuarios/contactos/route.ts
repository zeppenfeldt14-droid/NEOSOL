import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        alias: true,
        nombre: true,
        nivel: true,
        zona: true,
        rol: true
      },
      orderBy: [
        { nivel: 'asc' },
        { nombre: 'asc' }
      ]
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Error fetching contactos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
