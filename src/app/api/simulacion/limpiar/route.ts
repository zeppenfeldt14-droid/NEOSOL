import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const prefix = '[TEST] '

    // Find all test users
    const testUsers = await prisma.usuario.findMany({
      where: { nombre: { startsWith: prefix } }
    })
    const userIds = testUsers.map(u => u.id)

    // Find all test companies
    const testEmpresas = await prisma.empresa.findMany({
      where: { nombre: { startsWith: prefix } }
    })
    const empresaIds = testEmpresas.map(e => e.id)

    // Delete in cascade
    if (empresaIds.length > 0) {
      await prisma.cobranza.deleteMany({ where: { empresaId: { in: empresaIds } } })
      await prisma.factura.deleteMany({ where: { pedido: { empresaId: { in: empresaIds } } } })
      await prisma.detallePedido.deleteMany({ where: { pedido: { empresaId: { in: empresaIds } } } })
      await prisma.pedido.deleteMany({ where: { empresaId: { in: empresaIds } } })
      await prisma.visita.deleteMany({ where: { empresaId: { in: empresaIds } } })
      await prisma.accion.deleteMany({ where: { empresaId: { in: empresaIds } } })
      await prisma.empresa.deleteMany({ where: { id: { in: empresaIds } } })
    }

    if (userIds.length > 0) {
      await prisma.logBitacora.deleteMany({ where: { usuarioId: { in: userIds } } })
      await prisma.usuario.deleteMany({ where: { id: { in: userIds } } })
    }

    return NextResponse.json({
      success: true,
      message: 'Limpieza de simulación completada.',
      deletedUsers: userIds.length,
      deletedEmpresas: empresaIds.length
    })

  } catch (error: any) {
    console.error('Simulation Cleanup Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
