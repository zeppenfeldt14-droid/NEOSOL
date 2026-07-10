'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getSessionUser, registrarAccion } from '@/lib/auth'

export async function createEmpresa(formData: FormData) {
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
  
  const defaultZona = formData.get('defaultZona') as string || 'CABA'
  const subZona = formData.get('subZona') as string || 'SIN ASIGNAR'
  
  const canModifyConfig = user && user.nivel === 1
  const zona = canModifyConfig ? (formData.get('zona') as string || defaultZona) : defaultZona
  const ocultarVendedor = canModifyConfig ? (formData.get('ocultarVendedor') === 'on' || formData.get('ocultarVendedor') === 'true') : false

  const notas = formData.get('notas') as string
  
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

  const empresa = await prisma.empresa.create({
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
      subZona,
      ocultarVendedor,
      notas,
      estado: 'prospecto',
      cicloVentaDias
    }
  })

  if (user) {
    await registrarAccion(
      user.id,
      user.alias,
      'CREATE_EMPRESA',
      `Creada empresa: ${empresa.nombre} (ID: ${empresa.id})`
    )
  }

  redirect(`/empresas/${empresa.id}`)
}
