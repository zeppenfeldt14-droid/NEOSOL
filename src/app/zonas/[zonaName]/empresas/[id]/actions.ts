'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSessionUser, registrarAccion } from '@/lib/auth'


export async function addVisita(empresaId: number, formData: FormData) {
  const user = await getSessionUser()
  const fecha = formData.get('fecha') as string
  const tipo = (formData.get('tipo') as string) || 'visita'  // 'visita' | 'correo' | 'whatsapp'
  const resultado = formData.get('resultado') as string
  const contacto = formData.get('contacto') as string
  const cargo = formData.get('cargo') as string
  const notas = formData.get('notas') as string
  const proximaAccion = formData.get('proximaAccion') as string

  const visita = await prisma.visita.create({
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

  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'CREATE_VISITA',
      `Visita registrada para empresa ID: ${empresaId} - Tipo: ${tipo}`
    )
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { zona: true } })
  const zona = empresa?.zona || 'CABA'
  revalidatePath(`/zonas/${zona}/empresas/${empresaId}`)
}

export async function addAccion(empresaId: number, formData: FormData) {
  const user = await getSessionUser()
  const tipo = formData.get('tipo') as string
  const descripcion = formData.get('descripcion') as string
  const fechaVencimiento = formData.get('fechaVencimiento') as string
  const prioridad = (formData.get('prioridad') as string) || 'media'

  await prisma.accion.create({
    data: {
      empresaId,
      tipo,
      descripcion,
      prioridad,
      fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null
    }
  })

  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'CREATE_ACCION',
      `Acción de ruta creada para empresa ID: ${empresaId} - Tipo: ${tipo}`
    )
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { zona: true } })
  const zona = empresa?.zona || 'CABA'
  revalidatePath(`/zonas/${zona}/empresas/${empresaId}`)
}

export async function addAlerta(empresaId: number, formData: FormData) {
  const user = await getSessionUser()
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

  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'CREATE_ALERTA',
      `Alerta configurada para empresa ID: ${empresaId} - Tipo: ${tipo}`
    )
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { zona: true } })
  const zona = empresa?.zona || 'CABA'
  revalidatePath(`/zonas/${zona}/empresas/${empresaId}`)
}

export async function completeAccion(accionId: number, empresaId: number) {
  const user = await getSessionUser()
  await prisma.accion.update({
    where: { id: accionId },
    data: { 
      estado: 'completada',
      completadaEn: new Date()
    }
  })
  
  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'COMPLETE_ACCION',
      `Acción de ruta ID: ${accionId} completada para empresa ID: ${empresaId}`
    )
  }
  
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { zona: true } })
  const zona = empresa?.zona || 'CABA'
  revalidatePath(`/zonas/${zona}/empresas/${empresaId}`)
}

export async function updateEmpresa(empresaId: number, formData: FormData) {
  const user = await getSessionUser()
  const nombre = formData.get('nombre') as string
  const cuit = formData.get('cuit') as string
  const direccion = formData.get('direccion') as string
  const direccionFiscal = formData.get('direccionFiscal') as string
  const barrio = formData.get('barrio') as string
  const partido = formData.get('partido') as string
  const telefono = formData.get('telefono') as string
  const email = formData.get('email') as string
  const responsable = formData.get('responsable') as string
  const subZona = formData.get('subZona') as string || 'SIN ASIGNAR'
  
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

  const canModifyConfig = user && user.nivel === 1

  const notasFinal = estado === 'baja' && motivoBaja
    ? `[BAJA - ${new Date().toLocaleDateString('es-AR')}] ${motivoBaja}\n\n${notas || ''}`.trim()
    : notas

  const updateData: any = {
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
    subZona,
    notas: notasFinal,
    estado,
    cicloVentaDias,
  }

  if (canModifyConfig) {
    const newZona = formData.get('zona') as string
    if (newZona) updateData.zona = newZona
    updateData.ocultarVendedor = formData.get('ocultarVendedor') === 'on' || formData.get('ocultarVendedor') === 'true'
  }

  if (!nombre) {
    throw new Error('El nombre de la empresa es obligatorio')
  }

  if (estado === 'baja' && !motivoBaja?.trim()) {
    throw new Error('El motivo de baja es obligatorio')
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: updateData
  })

  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'UPDATE_EMPRESA',
      `Empresa actualizada: ${nombre} (ID: ${empresaId})`
    )
  }

  const updatedEmp = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { zona: true }
  })
  const finalZona = updatedEmp?.zona || 'CABA'

  revalidatePath(`/zonas/${finalZona}/empresas/${empresaId}`)
  revalidatePath(`/zonas/${finalZona}/empresas`)
}

export async function toggleRespuestaObtenida(visitaId: number, currentStatus: boolean, zonaName: string, empresaId: number) {
  'use server'
  await prisma.visita.update({
    where: { id: visitaId },
    data: { respuestaObtenida: !currentStatus }
  })
  revalidatePath(`/zonas/${zonaName}/empresas/${empresaId}`)
}