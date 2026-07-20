import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const zona = searchParams.get('zona')

    if (!zona) {
      return NextResponse.json({ error: 'Zona requerida' }, { status: 400 })
    }

    const notas = await prisma.notaPlanificador.findMany({
      where: { zona },
      include: {
        empresa: {
          select: { nombre: true, id: true }
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
    const { texto, empresaId, destinatario, zona } = body

    if (!texto || !zona) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const newNota = await prisma.notaPlanificador.create({
      data: {
        texto,
        empresaId: empresaId ? parseInt(empresaId) : null,
        destinatario: destinatario || 'personal',
        zona,
        estado: 'pendiente'
      },
      include: {
        empresa: {
          select: { nombre: true, id: true }
        }
      }
    })

    return NextResponse.json(newNota)
  } catch (error) {
    console.error('Error creating nota:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
