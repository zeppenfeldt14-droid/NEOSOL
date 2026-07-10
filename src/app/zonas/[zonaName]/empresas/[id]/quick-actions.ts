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
