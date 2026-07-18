'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function setEmpresaEstado(id: number, estado: string) {
  await prisma.empresa.update({
    where: { id },
    data: { estado }
  })
  revalidatePath(`/empresas/${id}`)
  revalidatePath('/empresas')
  revalidatePath('/planificador')
}

export async function descartarEmpresa(id: number, motivo: string) {
  const empresa = await prisma.empresa.findUnique({ where: { id } })
  if (!empresa) return

  const fechaActual = new Date().toLocaleDateString('es-AR')
  const notaAdicional = `\n\n[DESCARTADO - ${fechaActual}]\nMotivo: ${motivo}`
  const nuevasNotas = (empresa.notas || '') + notaAdicional

  await prisma.empresa.update({
    where: { id },
    data: { 
      estado: 'descartada',
      notas: nuevasNotas.trim()
    }
  })
  
  revalidatePath(`/empresas/${id}`)
  revalidatePath('/empresas')
  revalidatePath('/planificador')
}

export async function eliminarEmpresaDefinitivamente(id: number) {
  // Las relaciones (visitas, acciones, etc) deberían eliminarse en cascada 
  // pero por las dudas eliminamos primero las dependencias si Prisma no tiene onDelete: Cascade
  
  await prisma.accion.deleteMany({ where: { empresaId: id } })
  await prisma.visita.deleteMany({ where: { empresaId: id } })
  await prisma.alerta.deleteMany({ where: { empresaId: id } })
  
  await prisma.empresa.delete({
    where: { id }
  })
  
  revalidatePath('/empresas')
  revalidatePath('/planificador')
  revalidatePath('/')
}

export async function darDeBajaEmpresa(id: number, motivoBaja: string) {
  await prisma.empresa.update({
    where: { id },
    data: {
      estado: 'baja',
      motivoBaja: motivoBaja.trim()
    }
  })
  
  revalidatePath(`/empresas/${id}`)
  revalidatePath('/empresas')
  revalidatePath('/planificador')
  revalidatePath('/')
}

export async function reactivarCliente(id: number) {
  await prisma.empresa.update({
    where: { id },
    data: {
      estado: 'activo',
      motivoBaja: null
    }
  })
  
  revalidatePath(`/empresas/${id}`)
  revalidatePath('/empresas')
  revalidatePath('/planificador')
  revalidatePath('/')
}

export async function solicitarEliminacion(tipo: 'EMPRESA' | 'ACCION', targetId: number, nombreTarget: string, solicitadoPor: string, motivo: string) {
  await prisma.solicitudEliminacion.create({
    data: {
      tipo,
      targetId,
      nombreTarget,
      solicitadoPor,
      motivo: motivo.trim()
    }
  })
}

export async function getSolicitudesPendientes() {
  return await prisma.solicitudEliminacion.findMany({
    where: { estado: 'pendiente' },
    orderBy: { creadoEn: 'desc' }
  })
}

export async function resolverSolicitudEliminacion(solicitudId: number, aprobado: boolean) {
  const solicitud = await prisma.solicitudEliminacion.findUnique({
    where: { id: solicitudId }
  })
  if (!solicitud) return

  if (aprobado) {
    try {
      if (solicitud.tipo === 'EMPRESA') {
        await prisma.accion.deleteMany({ where: { empresaId: solicitud.targetId } })
        await prisma.visita.deleteMany({ where: { empresaId: solicitud.targetId } })
        await prisma.alerta.deleteMany({ where: { empresaId: solicitud.targetId } })
        await prisma.empresa.delete({ where: { id: solicitud.targetId } })
      } else if (solicitud.tipo === 'ACCION') {
        await prisma.accion.delete({ where: { id: solicitud.targetId } })
      }
    } catch (e) {
      console.error('Error al ejecutar eliminación aprobada:', e)
    }
  }

  await prisma.solicitudEliminacion.update({
    where: { id: solicitudId },
    data: { estado: aprobado ? 'aprobado' : 'rechazado' }
  })

  revalidatePath('/empresas')
  revalidatePath('/planificador')
  revalidatePath('/')
}
