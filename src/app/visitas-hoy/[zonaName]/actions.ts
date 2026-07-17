'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function completarAccionMovil(
  accionId: number,
  empresaId: number,
  notas: string,
  resultado: string,
  tipo: string = 'visita'
) {
  try {
    await prisma.$transaction([
      prisma.accion.update({ where: { id: accionId }, data: { estado: 'completada', completadaEn: new Date() } }),
      prisma.visita.create({ data: { empresaId, tipo, resultado: resultado || 'gestionado', notas: notas || tipo + ' completado desde enlace movil.' } })
    ])
    if (resultado === 'venta') { await prisma.empresa.update({ where: { id: empresaId }, data: { estado: 'activo' } }) }
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { zona: true } })
    const zona = empresa?.zona || 'CABA'
    revalidatePath('/visitas-hoy/' + encodeURIComponent(zona))
    revalidatePath('/zonas/' + zona)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function reagendarAccionMovil(accionId: number, nuevaFechaStr: string) {
  try {
    const date = new Date(nuevaFechaStr + 'T03:00:00.000Z')
    await prisma.accion.update({ where: { id: accionId }, data: { fechaVencimiento: date } })
    const accion = await prisma.accion.findUnique({ where: { id: accionId }, include: { empresa: { select: { zona: true } } } })
    const zona = accion?.empresa?.zona || 'CABA'
    revalidatePath('/visitas-hoy/' + encodeURIComponent(zona))
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
