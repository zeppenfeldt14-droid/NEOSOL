import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const rubros = await prisma.rubro.findMany({
      orderBy: { nombre: 'asc' }
    })
    return NextResponse.json(rubros)
  } catch (error: any) {
    console.error('[API GET Rubros]', error)
    return NextResponse.json({ error: 'Error al listar rubros.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const body = await request.json()
    const { nombre } = body

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del rubro es requerido.' }, { status: 400 })
    }

    const normalizedNombre = nombre.trim().toUpperCase()

    // Check if already exists
    const exists = await prisma.rubro.findUnique({
      where: { nombre: normalizedNombre }
    })

    if (exists) {
      return NextResponse.json({ error: 'Este rubro ya existe.' }, { status: 400 })
    }

    const rubro = await prisma.rubro.create({
      data: { nombre: normalizedNombre }
    })

    return NextResponse.json(rubro)
  } catch (error: any) {
    console.error('[API POST Rubro]', error)
    return NextResponse.json({ error: 'Error al crear rubro.' }, { status: 500 })
  }
}
