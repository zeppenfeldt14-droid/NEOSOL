import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const facturaId = parseInt(resolvedParams.id, 10)
    if (isNaN(facturaId)) {
      return NextResponse.json({ error: 'ID de factura inválido' }, { status: 400 })
    }

    const data = await req.json()
    const { base64, mimeType } = data

    if (!base64) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    // Actualizar la factura
    const factura = await prisma.factura.update({
      where: { id: facturaId },
      data: {
        archivoBase64: base64,
        archivoMimeType: mimeType || 'application/pdf',
      },
      include: {
        pedido: {
          include: {
            empresa: true
          }
        }
      }
    })

    // Crear una acción/alerta para el vendedor si la sube el nivel 1 o 2
    if (user.nivel < 3) {
      // Buscar el vendedor asignado al pedido
      const empresa = factura.pedido.empresa
      
      await prisma.accion.create({
        data: {
          empresaId: empresa.id,
          tipo: 'Llamada',
          descripcion: `Llamar a ${empresa.nombre} para notificar entrega, enviar factura (Tipo ${factura.tipo}) y confirmar método de pago.`,
          prioridad: 'alta',
          estado: 'pendiente'
        }
      })
    }

    // Registrar en bitácora
    await prisma.logBitacora.create({
      data: {
        usuarioId: user.id,
        usuarioAlias: user.alias,
        tipoAccion: 'UPLOAD_FACTURA',
        detalles: `Subió archivo para factura ID: ${factura.id}`
      }
    })

    return NextResponse.json({ success: true, factura })
  } catch (error: any) {
    console.error('Upload Factura Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
