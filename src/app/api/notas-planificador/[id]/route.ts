import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    
    const body = await request.json()
    const { estado, recordatorioVisto } = body

    const data: any = {}
    if (estado !== undefined) data.estado = estado
    if (recordatorioVisto !== undefined) data.recordatorioVisto = recordatorioVisto

    const nota = await prisma.notaPlanificador.update({
      where: { id },
      data
    })

    return NextResponse.json(nota)
  } catch (error) {
    console.error('Error updating nota:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    await prisma.notaPlanificador.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting nota:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
