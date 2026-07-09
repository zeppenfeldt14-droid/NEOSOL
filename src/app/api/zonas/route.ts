import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

// GET: Retrieve all zones
export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const zones = await prisma.zona.findMany({
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json(zones)
  } catch (error: any) {
    console.error('[API GET Zonas] Error:', error)
    return NextResponse.json({ error: 'Error al listar las zonas.' }, { status: 500 })
  }
}

// POST: Create a new zone (N1 only)
export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre } = body

    if (!nombre || nombre.trim() === '') {
      return NextResponse.json({ error: 'El nombre de la zona es obligatorio.' }, { status: 400 })
    }

    const normalizedName = nombre.trim().toUpperCase()

    // Check if zone already exists
    const existing = await prisma.zona.findUnique({
      where: { nombre: normalizedName }
    })

    if (existing) {
      return NextResponse.json({ error: 'Esta zona ya existe.' }, { status: 400 })
    }

    const newZone = await prisma.zona.create({
      data: { nombre: normalizedName }
    })

    await registrarAccion(
      session.id,
      session.alias,
      'CREATE_ZONE',
      `Nueva zona creada: ${newZone.nombre}`
    )

    return NextResponse.json({ success: true, zone: newZone })
  } catch (error: any) {
    console.error('[API POST Zonas] Error:', error)
    return NextResponse.json({ error: 'Error al crear la zona.' }, { status: 500 })
  }
}
