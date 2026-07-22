import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const promociones = await prisma.promocion.findMany({
      include: {
        detallesPromocion: {
          include: { producto: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })

    return NextResponse.json(promociones)
  } catch (error: any) {
    console.error('[API GET Promociones]', error)
    return NextResponse.json({ error: 'Error al listar promociones.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, descripcion, tipo, compraMinima, bonificacion, descuento, vigenciaDesdeStr, vigenciaHastaStr, productoIds } = body

    if (!nombre) {
      return NextResponse.json({ error: 'Nombre es requerido.' }, { status: 400 })
    }

    const vigenciaDesde = vigenciaDesdeStr ? new Date(vigenciaDesdeStr) : null
    const vigenciaHasta = vigenciaHastaStr ? new Date(vigenciaHastaStr) : null

    const promo = await prisma.promocion.create({
      data: {
        nombre,
        descripcion,
        tipo: tipo || 'bonificacion', // 'bonificacion' | 'descuento_porcentaje' | 'precio_especial'
        compraMinima: compraMinima !== undefined ? parseInt(compraMinima) : null,
        bonificacion: bonificacion !== undefined ? parseInt(bonificacion) : null,
        descuento: descuento !== undefined ? parseFloat(descuento) : null,
        vigenciaDesde,
        vigenciaHasta,
        activa: true,
        ...(productoIds && productoIds.length > 0 ? {
          detallesPromocion: {
            create: productoIds.map((id: number) => ({ productoId: id }))
          }
        } : {})
      }
    })

    return NextResponse.json({ success: true, promo })
  } catch (error: any) {
    console.error('[API POST Promocion]', error)
    return NextResponse.json({ error: 'Error al crear promoción.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, nombre, descripcion, tipo, compraMinima, bonificacion, descuento, vigenciaDesdeStr, vigenciaHastaStr, productoIds } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de la promoción es requerido.' }, { status: 400 })
    }

    const existing = await prisma.promocion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Promoción no encontrada.' }, { status: 404 })
    }

    if (action === 'toggle_activa') {
      await prisma.promocion.update({
        where: { id },
        data: { activa: !existing.activa }
      })
      return NextResponse.json({ success: true })
    }

    // Default update (for extending validity etc.)
    const vigenciaDesde = vigenciaDesdeStr ? new Date(vigenciaDesdeStr) : existing.vigenciaDesde
    const vigenciaHasta = vigenciaHastaStr ? new Date(vigenciaHastaStr) : existing.vigenciaHasta

    await prisma.promocion.update({
      where: { id },
      data: {
        nombre: nombre || existing.nombre,
        descripcion: descripcion !== undefined ? descripcion : existing.descripcion,
        tipo: tipo || existing.tipo,
        compraMinima: compraMinima !== undefined ? (compraMinima !== null ? parseInt(compraMinima) : null) : existing.compraMinima,
        bonificacion: bonificacion !== undefined ? (bonificacion !== null ? parseInt(bonificacion) : null) : existing.bonificacion,
        descuento: descuento !== undefined ? (descuento !== null ? parseFloat(descuento) : null) : existing.descuento,
        vigenciaDesde,
        vigenciaHasta,
        ...(productoIds !== undefined ? {
          detallesPromocion: {
            deleteMany: {},
            create: productoIds.map((pid: number) => ({ productoId: pid }))
          }
        } : {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API PUT Promocion]', error)
    return NextResponse.json({ error: 'Error al actualizar la promoción.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1) {
      return NextResponse.json({ error: 'No autorizado. Se requiere nivel 1.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')
    if (!idStr) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })

    const id = parseInt(idStr)
    
    // Eliminar detalles primero para evitar error de FK (foreign key constraints)
    await prisma.detallePromocion.deleteMany({
      where: { promocionId: id }
    })

    await prisma.promocion.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API DELETE Promocion]', error)
    return NextResponse.json({ error: 'Error al eliminar promoción.' }, { status: 500 })
  }
}
