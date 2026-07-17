import { prisma } from '@/lib/prisma'

export type PredictiveAlert = {
  id: string
  empresaId: number
  empresaNombre: string
  tipo: 'seguimiento_pendiente' | 'quiebre_stock' | 'alerta_cobranza' | 'oportunidad_reactivacion'
  nivelSeveridad: 'amarillo' | 'rojo' | 'naranja' | 'azul'
  mensaje: string
  fechaGeneracion: string
  escaladaNivel2?: boolean
  escaladaNivel1?: boolean
}

/**
 * Calcula las alertas en tiempo real para un vendedor o supervisor.
 */
export async function getPredictiveAlerts(params: {
  usuarioNivel: number
  vendedorAlias?: string
  zona?: string
}): Promise<PredictiveAlert[]> {
  const alertas: PredictiveAlert[] = []
  const hoy = new Date()

  // 1. Obtener empresas según el rol
  const empresasQuery: any = {
    include: {
      visitas: { orderBy: { fecha: 'desc' }, take: 1 },
      cobranzas: { where: { estado: 'pendiente' } }
    }
  }

  if (params.usuarioNivel === 3 && params.vendedorAlias) {
    empresasQuery.where = { vendedorAsignado: params.vendedorAlias }
  } else if (params.usuarioNivel === 2 && params.zona) {
    empresasQuery.where = { zona: params.zona }
  }

  const empresas = await prisma.empresa.findMany(empresasQuery) as any[]

  for (const emp of empresas) {
    const ultimaVisita = emp.visitas[0]?.fecha || emp.creadoEn
    const diasDesdeUltimaVisita = Math.floor((hoy.getTime() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24))

    // A. Prospecto: > 7 días sin visita o cotización
    if (emp.estado === 'prospecto' && diasDesdeUltimaVisita > 7) {
      alertas.push({
        id: `prosp-${emp.id}`,
        empresaId: emp.id,
        empresaNombre: emp.nombre,
        tipo: 'seguimiento_pendiente',
        nivelSeveridad: 'amarillo',
        mensaje: `Prospecto inactivo hace ${diasDesdeUltimaVisita} días. Requiere seguimiento.`,
        fechaGeneracion: hoy.toISOString(),
        escaladaNivel2: diasDesdeUltimaVisita > 9, // +48 hrs
        escaladaNivel1: diasDesdeUltimaVisita > 11
      })
    }

    // B. Activa: Frecuencia semanal (ej. >3 al mes) y >14 días sin visita/pedido
    if (emp.estado === 'activo' && (emp.frecuenciaCompra || 0) >= 4 && diasDesdeUltimaVisita > 14) {
      alertas.push({
        id: `stock-${emp.id}`,
        empresaId: emp.id,
        empresaNombre: emp.nombre,
        tipo: 'quiebre_stock',
        nivelSeveridad: 'rojo',
        mensaje: `Posible quiebre de stock. Cliente frecuente inactivo hace ${diasDesdeUltimaVisita} días.`,
        fechaGeneracion: hoy.toISOString(),
        escaladaNivel2: diasDesdeUltimaVisita > 16,
        escaladaNivel1: diasDesdeUltimaVisita > 18
      })
    }

    // C. Cobranza: Factura vence en < 48 horas (2 días)
    const cobrosPendientes = emp.cobranzas || []
    for (const cobro of cobrosPendientes) {
      if (cobro.fechaVencimiento) {
        const diasParaVencer = Math.floor((new Date(cobro.fechaVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        if (diasParaVencer >= 0 && diasParaVencer <= 2) {
          alertas.push({
            id: `cobro-${cobro.id}`,
            empresaId: emp.id,
            empresaNombre: emp.nombre,
            tipo: 'alerta_cobranza',
            nivelSeveridad: 'naranja',
            mensaje: `Cobranza próxima a vencer en ${diasParaVencer} días (Monto: $${cobro.saldoPendiente}).`,
            fechaGeneracion: hoy.toISOString(),
            escaladaNivel2: diasParaVencer < 0,
            escaladaNivel1: diasParaVencer < -2
          })
        }
      }
    }

    // D. De Baja: > 60 días desde fechaBaja
    if (emp.estado === 'baja' && emp.fechaBaja) {
      const diasDeBaja = Math.floor((hoy.getTime() - new Date(emp.fechaBaja).getTime()) / (1000 * 60 * 60 * 24))
      if (diasDeBaja > 60) {
        alertas.push({
          id: `baja-${emp.id}`,
          empresaId: emp.id,
          empresaNombre: emp.nombre,
          tipo: 'oportunidad_reactivacion',
          nivelSeveridad: 'azul',
          mensaje: `Cliente de baja hace ${diasDeBaja} días. Enviar promo de reactivación.`,
          fechaGeneracion: hoy.toISOString(),
          escaladaNivel2: false, // Las reactivaciones no suelen escalar punitivamente
          escaladaNivel1: false
        })
      }
    }
  }

  // Filtrado de escalado según RBAC
  return alertas.filter(a => {
    if (params.usuarioNivel === 3) return true // Vendedor ve todo lo suyo
    if (params.usuarioNivel === 2) return a.escaladaNivel2 // Nivel 2 solo ve las escaladas a su nivel o mayor
    if (params.usuarioNivel === 1) return a.escaladaNivel1 // Gerencia ve lo escalado a N1
    return false
  })
}
