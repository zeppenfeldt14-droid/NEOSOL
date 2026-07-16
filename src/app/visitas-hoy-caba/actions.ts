'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function completarVisitaAction(
  accionId: number,
  empresaId: number,
  notas: string,
  resultado: string
) {
  try {
    await prisma.$transaction([
      prisma.accion.update({
        where: { id: accionId },
        data: {
          estado: 'completada',
          completadaEn: new Date()
        }
      }),
      prisma.visita.create({
        data: {
          empresaId,
          tipo: 'visita',
          resultado: resultado || 'visita_realizada',
          notas: notas || 'Visita completada desde el enlace móvil.'
        }
      })
    ])

    // Actualizar estado de la empresa si hubo venta
    if (resultado === 'venta') {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { estado: 'activo' }
      })
    }

    revalidatePath('/visitas-hoy-caba')
    return { success: true }
  } catch (error: any) {
    console.error('Error in completarVisitaAction:', error)
    return { success: false, error: error.message }
  }
}

export async function reagendarVisitaAction(accionId: number, nuevaFechaStr: string) {
  try {
    const date = new Date(nuevaFechaStr + 'T03:00:00.000Z') // Force Argentina midnight UTC-3
    await prisma.accion.update({
      where: { id: accionId },
      data: {
        fechaVencimiento: date
      }
    })

    revalidatePath('/visitas-hoy-caba')
    return { success: true }
  } catch (error: any) {
    console.error('Error in reagendarVisitaAction:', error)
    return { success: false, error: error.message }
  }
}
