'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSessionUser, registrarAccion } from '@/lib/auth'

/**
 * Cierra una visita de ruta (Accion) de forma inteligente:
 * 1. Marca la Accion como completada
 * 2. Crea un registro en Visita (historial + KPIs)
 * 3. Si se indica, crea la próxima Accion de seguimiento
 * 4. Actualiza el estado de la Empresa si hubo venta
 */
export async function completarVisitaConRegistro(payload: {
  accionId: number
  empresaId: number
  // Datos de la visita
  resultado: string
  contacto: string
  cargo: string
  notas: string
  exhibicion: string
  // Próxima acción (opcional)
  crearSiguienteAccion: boolean
  siguienteAccionTipo?: string
  siguienteAccionDescripcion?: string
  siguienteAccionFecha?: string
  siguienteAccionPrioridad?: string
}) {
  const user = await getSessionUser()
  const hoy = new Date()

  // 1. Marcar la Accion como completada
  await prisma.accion.update({
    where: { id: payload.accionId },
    data: {
      estado: 'completada',
      completadaEn: hoy
    }
  })

  // 2. Registrar la Visita en historial
  await prisma.visita.create({
    data: {
      empresaId: payload.empresaId,
      fecha: hoy,
      tipo: 'visita',
      resultado: payload.resultado,
      contacto: payload.contacto || '',
      cargo: payload.cargo || null,
      notas: payload.notas || '',
      exhibicion: payload.exhibicion || null,
      usuarioAlias: user?.alias || null
    }
  })

  // 3. Actualizar estado de la empresa si hay venta
  if (payload.resultado === 'venta') {
    await prisma.empresa.update({
      where: { id: payload.empresaId },
      data: { estado: 'activo' }
    })
  }

  // 4. Crear la siguiente acción de seguimiento si el usuario lo indicó
  if (payload.crearSiguienteAccion && payload.siguienteAccionTipo) {
    await prisma.accion.create({
      data: {
        empresaId: payload.empresaId,
        tipo: payload.siguienteAccionTipo,
        descripcion: payload.siguienteAccionDescripcion || `Seguimiento: ${payload.siguienteAccionTipo}`,
        prioridad: payload.siguienteAccionPrioridad || 'media',
        fechaVencimiento: payload.siguienteAccionFecha
          ? new Date(payload.siguienteAccionFecha + 'T03:00:00.000Z')
          : null
      }
    })
  }

  // 5. Log de auditoría
  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'CHECKOUT_VISITA',
      `Visita completada para empresa ID: ${payload.empresaId} — Resultado: ${payload.resultado}`
    )
  }

  // 6. Revalidar rutas afectadas
  const empresa = await prisma.empresa.findUnique({
    where: { id: payload.empresaId },
    select: { zona: true }
  })
  const zona = empresa?.zona || 'CABA'
  revalidatePath(`/zonas/${zona}/planificador`)
  revalidatePath(`/zonas/${zona}/empresas/${payload.empresaId}`)
  revalidatePath(`/zonas/${zona}`)
}
