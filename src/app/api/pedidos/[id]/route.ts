import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ─── GET: Detalle de un pedido ───────────────────────────────────────────────
export async function GET(_: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    const { id } = await params

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: {
        empresa: true,
        detalles: { include: { producto: true } },
        facturas: true,
        cobranzas: { include: { pagos: true } },
      },
    })

    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    // Zone access check for Level 3
    if (session.nivel === 3 && pedido.zona !== session.zona) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    return NextResponse.json(pedido)
  } catch (error: any) {
    console.error('[API GET Pedido]', error)
    return NextResponse.json({ error: 'Error al obtener el pedido.' }, { status: 500 })
  }
}

// ─── PATCH: Actualizar estado del pedido ─────────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    const { id } = await params

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    const body = await request.json()
    const { accion } = body // 'enviar' | 'aprobar' | 'cancelar'

    // ── Transiciones de estado permitidas por nivel ──────────────────────────
    // Nivel 3 puede: borrador → pendiente_supervisor
    // Nivel 1/2 pueden: pendiente_supervisor → aprobado | cancelado

    let nuevoEstado: string | null = null
    let aprobadoPor: Partial<typeof pedido> = {}

    if (accion === 'enviar') {
      if (session.nivel > 2) {
        if (pedido.estado !== 'borrador')
          return NextResponse.json({ error: 'Solo se puede enviar un pedido en borrador.' }, { status: 400 })
        nuevoEstado = 'pendiente_supervisor'
      } else {
        return NextResponse.json({ error: 'Solo el vendedor puede enviar un pedido.' }, { status: 403 })
      }
    } else if (accion === 'aprobar') {
      if (session.nivel > 2)
        return NextResponse.json({ error: 'Sin permisos para aprobar.' }, { status: 403 })
      if (pedido.estado !== 'pendiente_supervisor')
        return NextResponse.json({ error: 'Solo se puede aprobar un pedido pendiente.' }, { status: 400 })
      nuevoEstado = 'aprobado'
      aprobadoPor = {
        aprobadoPorId: session.id,
        aprobadoPorAlias: session.alias,
        aprobadoEn: new Date(),
      }
    } else if (accion === 'cancelar') {
      if (pedido.estado === 'aprobado' && session.nivel > 1)
        return NextResponse.json({ error: 'Solo Nivel 1 puede cancelar un pedido aprobado.' }, { status: 403 })
      nuevoEstado = 'cancelado'
    } else {
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
    }

    const updated = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { estado: nuevoEstado, ...aprobadoPor },
    })

    // If approved → auto-generate Facturas and Cobranzas
    if (nuevoEstado === 'aprobado') {
      await generarFacturasYCobranzas(updated, session.alias)
    }

    await registrarAccion(
      session.id, session.alias,
      `PEDIDO_${accion.toUpperCase()}`,
      `Pedido ${pedido.numeroPedido} cambió a estado: ${nuevoEstado}`
    )

    return NextResponse.json({ success: true, pedido: updated })
  } catch (error: any) {
    console.error('[API PATCH Pedido]', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar el pedido.' }, { status: 500 })
  }
}

// ─── Helper: Generar Facturas y Cobranzas al aprobar ────────────────────────
async function generarFacturasYCobranzas(pedido: any, alias: string) {
  const año = new Date().getFullYear()
  const baseNum = pedido.id

  // Factura B (sin IVA) → parte porcentajePagoB
  const montoB = pedido.subtotalSinIVA * (pedido.porcentajePagoB / 100)
  if (montoB > 0) {
    const recargo = pedido.aplicaFinanciera ? montoB * 0.03 : 0
    await prisma.factura.create({
      data: {
        pedidoId: pedido.id,
        numeroFactura: `FAC-B-${año}-${String(baseNum).padStart(4, '0')}`,
        tipo: 'B',
        subtotal: montoB,
        iva: 0,
        recargo,
        total: montoB + recargo,
        estado: 'pendiente',
      },
    })
  }

  // Factura A (con IVA 21%) → parte porcentajePagoA
  const montoA = pedido.subtotalSinIVA * (pedido.porcentajePagoA / 100)
  if (montoA > 0) {
    const iva = montoA * 0.21
    const recargo = pedido.aplicaFinanciera ? (montoA + iva) * 0.03 : 0
    await prisma.factura.create({
      data: {
        pedidoId: pedido.id,
        numeroFactura: `FAC-A-${año}-${String(baseNum).padStart(4, '0')}`,
        tipo: 'A',
        subtotal: montoA,
        iva,
        recargo,
        total: montoA + iva + recargo,
        estado: 'pendiente',
      },
    })
  }

  // Generar Cobranza (cuenta por cobrar) por el total del pedido
  await prisma.cobranza.create({
    data: {
      pedidoId: pedido.id,
      empresaId: pedido.empresaId,
      empresaNombre: '', // populated from empresa relation if needed
      vendedorAlias: pedido.vendedorAlias,
      zona: pedido.zona,
      montoOriginal: pedido.totalGeneral,
      saldoPendiente: pedido.totalGeneral,
      cuota: 1,
      totalCuotas: 1,
      estado: 'pendiente',
    },
  })
}
