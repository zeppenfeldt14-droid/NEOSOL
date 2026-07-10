import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')

    if (!zona) {
      return NextResponse.json({ error: 'Zona es requerida.' }, { status: 400 })
    }

    const subZonas = await prisma.subZona.findMany({
      where: { zona },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json(subZonas)
  } catch (error: any) {
    console.error('[API GET SubZonas]', error)
    return NextResponse.json({ error: 'Error al listar sub-zonas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const body = await request.json()
    const { zona, nombre } = body

    if (!zona || !nombre) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
    }

    const normalizedNombre = nombre.trim().toUpperCase()

    // Check if already exists
    const exists = await prisma.subZona.findUnique({
      where: {
        zona_nombre: {
          zona,
          nombre: normalizedNombre
        }
      }
    })

    if (exists) {
      return NextResponse.json({ error: 'Esta sub-zona ya existe.' }, { status: 400 })
    }

    const subZona = await prisma.subZona.create({
      data: {
        zona,
        nombre: normalizedNombre
      }
    })

    return NextResponse.json({ success: true, subZona })
  } catch (error: any) {
    console.error('[API POST SubZona]', error)
    return NextResponse.json({ error: 'Error al crear sub-zona.' }, { status: 500 })
  }
}
