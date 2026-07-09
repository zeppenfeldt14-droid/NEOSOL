'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addVisita(empresaId: number, formData: FormData) {
  const fecha = formData.get('fecha') as string
  const tipo = (formData.get('tipo') as string) || 'visita'  // 'visita' | 'correo' | 'whatsapp'
  const resultado = formData.get('resultado') as string
  const contacto = formData.get('contacto') as string
  const cargo = formData.get('cargo') as string
  const notas = formData.get('notas') as string
  const proximaAccion = formData.get('proximaAccion') as string

  await prisma.visita.create({
    data: {
      empresaId,
      fecha: new Date(fecha),
      tipo,
      resultado,
      contacto,
      cargo,
      notas,
      proximaAccion
    }
  })

  // Actualizar estado si hubo venta
  if (resultado === 'venta') {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { estado: 'activo' }
    })
  }

  revalidatePath(`/empresas/${empresaId}`)
}

export async function addAccion(empresaId: number, formData: FormData) {
  const tipo = formData.get('tipo') as string
  const descripcion = formData.get('descripcion') as string
  const fechaVencimiento = formData.get('fechaVencimiento') as string
  const prioridad = formData.get('prioridad') as string

  await prisma.accion.create({
    data: {
      empresaId,
      tipo,
      descripcion,
      prioridad,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null
    }
  })

  revalidatePath(`/empresas/${empresaId}`)
}

export async function addAlerta(empresaId: number, formData: FormData) {
  const tipo = formData.get('tipo') as string
  const diasConfiguracion = parseInt(formData.get('diasConfiguracion') as string)
  const mensaje = formData.get('mensaje') as string

  await prisma.alerta.create({
    data: {
      empresaId,
      tipo,
      diasConfiguracion,
      mensaje
    }
  })

  // Update empresa frecuenciaVisita if it's that type
  if (tipo === 'frecuencia_visita' && diasConfiguracion) {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { frecuenciaVisita: diasConfiguracion }
    })
  }

  revalidatePath(`/empresas/${empresaId}`)
}

export async function completeAccion(accionId: number, empresaId: number) {
  await prisma.accion.update({
    where: { id: accionId },
    data: { 
      estado: 'completada',
      completadaEn: new Date()
    }
  })
  
  revalidatePath(`/empresas/${empresaId}`)
}

export async function updateEmpresa(empresaId: number, formData: FormData) {
  const nombre = formData.get('nombre') as string
  const cuit = formData.get('cuit') as string
  const direccion = formData.get('direccion') as string
  const direccionFiscal = formData.get('direccionFiscal') as string
  const barrio = formData.get('barrio') as string
  const partido = formData.get('partido') as string
  const telefono = formData.get('telefono') as string
  const email = formData.get('email') as string
  const responsable = formData.get('responsable') as string
  const zona = formData.get('zona') as string
  const notas = formData.get('notas') as string
  const estado = formData.get('estado') as string
  const motivoBaja = formData.get('motivoBaja') as string
  
  const contactoCobranzas = formData.get('contactoCobranzas') as string
  const diasPago = formData.get('diasPago') as string
  const vendedorAsignado = formData.get('vendedorAsignado') as string
  const actividad = formData.get('actividad') as string
  const productosInteres = formData.get('productosInteres') as string
  const transporte = formData.get('transporte') as string
  
  const cicloVentaStr = formData.get('cicloVentaDias') as string
  const cicloVentaDias = cicloVentaStr ? parseInt(cicloVentaStr) : null

  if (!nombre) {
    throw new Error('El nombre de la empresa es obligatorio')
  }

  if (estado === 'baja' && !motivoBaja?.trim()) {
    throw new Error('El motivo de baja es obligatorio')
  }

  // motivoBaja y fechaBaja se activan luego de reiniciar el servidor (prisma generate)
  // Por ahora, si hay motivo de baja lo guardamos en notas
  const notasFinal = estado === 'baja' && motivoBaja
    ? `[BAJA - ${new Date().toLocaleDateString('es-AR')}] ${motivoBaja}\n\n${notas || ''}`.trim()
    : notas

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      nombre,
      cuit,
      direccion,
      direccionFiscal,
      barrio,
      partido,
      telefono,
      email,
      responsable,
      contactoCobranzas,
      diasPago,
      vendedorAsignado,
      actividad,
      productosInteres,
      transporte,
      zona,
      notas: notasFinal,
      estado,
      cicloVentaDias,
    }
  })

  revalidatePath(`/empresas/${empresaId}`)
  revalidatePath('/empresas')
}
