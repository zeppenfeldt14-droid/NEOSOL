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

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const body = await request.json()
    const { zona, viejoNombre, nuevoNombre } = body

    if (!zona || !viejoNombre || !nuevoNombre) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
    }

    const oldNorm = viejoNombre.trim().toUpperCase()
    const newNorm = nuevoNombre.trim().toUpperCase()

    if (oldNorm === newNorm) {
      return NextResponse.json({ success: true })
    }

    // Check if subZona exists
    const existingSubZona = await prisma.subZona.findUnique({
      where: {
        zona_nombre: {
          zona,
          nombre: oldNorm
        }
      }
    })

    if (existingSubZona) {
      // Check if target name already exists
      const targetExists = await prisma.subZona.findUnique({
        where: {
          zona_nombre: {
            zona,
            nombre: newNorm
          }
        }
      })

      if (targetExists) {
        return NextResponse.json({ error: 'Ya existe una sub-zona con el nuevo nombre.' }, { status: 400 })
      }

      // Update subzona name
      await prisma.subZona.update({
        where: { id: existingSubZona.id },
        data: { nombre: newNorm }
      })
    } else {
      // Create it if it was only a dynamic subzona on empresas
      await prisma.subZona.create({
        data: {
          zona,
          nombre: newNorm
        }
      })
    }

    // Update all empresas in this zone with the old subzone name
    await prisma.empresa.updateMany({
      where: {
        zona,
        subZona: oldNorm
      },
      data: {
        subZona: newNorm
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API PUT SubZona]', error)
    return NextResponse.json({ error: 'Error al actualizar sub-zona.' }, { status: 500 })
  }
}

