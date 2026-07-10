import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// GET: Listar productos activos (para el formulario de pedido)
export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const productos = await prisma.producto.findMany({
      where: { activo: true },
      orderBy: [{ linea: 'asc' }, { nombre: 'asc' }],
    })

    return NextResponse.json(productos)
  } catch (error: any) {
    console.error('[API GET Productos]', error)
    return NextResponse.json({ error: 'Error al listar productos.' }, { status: 500 })
  }
}

// POST: Crear producto (Nivel 1 only)
export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1)
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    const body = await request.json()
    const { codigoInterno, nombre, linea, precioPaquete, paqPorCaja, precioCaja } = body

    if (!codigoInterno || !nombre || !precioCaja || !paqPorCaja) {
      return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 })
    }

    const producto = await prisma.producto.create({
      data: { codigoInterno, nombre, linea, precioPaquete, paqPorCaja, precioCaja },
    })

    return NextResponse.json({ success: true, producto })
  } catch (error: any) {
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'El código de producto ya existe.' }, { status: 400 })
    return NextResponse.json({ error: 'Error al crear el producto.' }, { status: 500 })
  }
}
