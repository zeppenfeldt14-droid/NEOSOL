import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')
    const alias = searchParams.get('alias')
    const global = searchParams.get('global')

    if (!zona && !global) {
      return NextResponse.json({ error: 'Zona o flag global requerido' }, { status: 400 })
    }

    let whereClause: any = {}

    if (global === 'true' && alias) {
      whereClause = {
        OR: [
          { destinatario: alias },
          { creadoPor: alias }
        ]
      }
    } else {
      whereClause = {
        OR: [
          { zona: zona as string }
        ]
      }
      if (alias) {
        whereClause.OR.push({ destinatario: alias })
      }
    }

    const notas = await prisma.notaPlanificador.findMany({
      where: whereClause,
      include: {
        empresa: {
          select: { nombre: true, id: true }
        },
        pedido: {
          select: { numeroPedido: true, id: true }
        },
        factura: {
          select: { numeroFactura: true, id: true }
        },
        cobranza: {
          select: { id: true, montoOriginal: true, cuota: true, totalCuotas: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    })

    return NextResponse.json(notas)
  } catch (error) {
    console.error('Error fetching notas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { texto, empresaId, destinatario, zona, fechaRecordatorio, pedidoId, facturaId, cobranzaId, creadoPor } = body

    if (!texto || !zona) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const newNota = await prisma.notaPlanificador.create({
      data: {
        texto,
        empresaId: empresaId ? parseInt(empresaId) : null,
        pedidoId: pedidoId ? parseInt(pedidoId) : null,
        facturaId: facturaId ? parseInt(facturaId) : null,
        cobranzaId: cobranzaId ? parseInt(cobranzaId) : null,
        destinatario: destinatario || 'personal',
        zona,
        fechaRecordatorio: fechaRecordatorio ? new Date(fechaRecordatorio) : null,
        estado: 'pendiente',
        creadoPor: creadoPor || null
      },
      include: {
        empresa: {
          select: { nombre: true, id: true }
        },
        pedido: {
          select: { numeroPedido: true, id: true }
        },
        factura: {
          select: { numeroFactura: true, id: true }
        },
        cobranza: {
          select: { id: true, montoOriginal: true, cuota: true, totalCuotas: true }
        }
      }
    })

    return NextResponse.json(newNota)
  } catch (error) {
    console.error('Error creating nota:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
