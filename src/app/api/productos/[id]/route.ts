import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ─── PATCH: Editar producto (Nivel 1 only) ───────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1)
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { codigoInterno, nombre, linea, precioPaquete, paqPorCaja, precioCaja, activo } = body

    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: {
        ...(codigoInterno !== undefined ? { codigoInterno } : {}),
        ...(nombre        !== undefined ? { nombre }        : {}),
        ...(linea         !== undefined ? { linea }         : {}),
        ...(precioPaquete !== undefined ? { precioPaquete } : {}),
        ...(paqPorCaja    !== undefined ? { paqPorCaja }    : {}),
        ...(precioCaja    !== undefined ? { precioCaja }    : {}),
        ...(activo        !== undefined ? { activo }        : {}),
      },
    })

    await registrarAccion(
      session.id, session.alias,
      'UPDATE_PRODUCTO',
      `Producto ${producto.codigoInterno} - ${producto.nombre} actualizado`
    )

    return NextResponse.json({ success: true, producto })
  } catch (error: any) {
    if (error.code === 'P2025')
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })
    if (error.code === 'P2002')
      return NextResponse.json({ error: 'El código ya existe en otro producto.' }, { status: 400 })
    return NextResponse.json({ error: 'Error al actualizar el producto.' }, { status: 500 })
  }
}

// ─── DELETE: Desactivar producto (soft delete) ───────────────────────────────
export async function DELETE(_: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel !== 1)
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })

    const { id } = await params
    const producto = await prisma.producto.update({
      where: { id: Number(id) },
      data: { activo: false },
    })

    await registrarAccion(
      session.id, session.alias,
      'DELETE_PRODUCTO',
      `Producto ${producto.codigoInterno} desactivado`
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al desactivar el producto.' }, { status: 500 })
  }
}
