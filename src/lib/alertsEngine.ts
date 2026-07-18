import { prisma } from '@/lib/prisma'

export type PredictiveAlert = {
  id: string
  empresaId: number
  empresaNombre: string
  tipo: 'seguimiento_pendiente' | 'quiebre_stock' | 'alerta_cobranza' | 'oportunidad_reactivacion'
  nivelSeveridad: 'amarillo' | 'rojo' | 'naranja' | 'azul'
  mensaje: string
  accionRecomendada: string
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
      acciones: { orderBy: { creadoEn: 'desc' }, take: 1 }
    }
  }

  // Filtro estricto por zona (importante para dashboards de Zona) y rol
  if (params.usuarioNivel === 3 && params.vendedorAlias) {
    empresasQuery.where = { vendedorAsignado: params.vendedorAlias }
    if (params.zona) empresasQuery.where.zona = params.zona
  } else if (params.zona) {
    empresasQuery.where = { zona: params.zona }
  }

  const empresas = await prisma.empresa.findMany(empresasQuery) as any[]
  
  // 2. Obtener cobranzas pendientes globalmente o filtradas por zona/vendedor
  const cobranzasQuery: any = { where: { estado: 'pendiente' } }
  if (params.usuarioNivel === 3 && params.vendedorAlias) {
    cobranzasQuery.where.vendedorAlias = params.vendedorAlias
    if (params.zona) cobranzasQuery.where.zona = params.zona
  } else if (params.zona) {
    cobranzasQuery.where.zona = params.zona
  }
  const cobranzasPendientes = await prisma.cobranza.findMany(cobranzasQuery)

  for (const emp of empresas) {
    const ultimaVisita = emp.visitas?.[0]?.fecha
    const ultimaAccion = emp.acciones?.[0]?.creadoEn
    
    // Encontrar la interacción más reciente
    const fechas = [
      ultimaVisita ? new Date(ultimaVisita).getTime() : 0,
      ultimaAccion ? new Date(ultimaAccion).getTime() : 0,
      new Date(emp.creadoEn).getTime()
    ]
    const ultimaInteraccion = new Date(Math.max(...fechas))

    const diasDesdeUltimaInteraccion = Math.floor((hoy.getTime() - ultimaInteraccion.getTime()) / (1000 * 60 * 60 * 24))

    // A. Prospecto: >= 7 días sin visita o cotización
    if (emp.estado === 'prospecto' && diasDesdeUltimaInteraccion >= 7) {
      alertas.push({
        id: `prosp-${emp.id}`,
        empresaId: emp.id,
        empresaNombre: emp.nombre,
        tipo: 'seguimiento_pendiente',
        nivelSeveridad: 'amarillo',
        mensaje: `Prospecto inactivo hace ${diasDesdeUltimaInteraccion} días.`,
        accionRecomendada: 'Registra una Visita o envíale un WhatsApp para activar el interés.',
        fechaGeneracion: hoy.toISOString(),
        escaladaNivel2: diasDesdeUltimaInteraccion > 9, // +48 hrs
        escaladaNivel1: diasDesdeUltimaInteraccion > 11
      })
    }

    // B. Activa: Regla basada en Ciclo de Venta (Días). Se activa 7 días antes. Default: 30 días.
    if (emp.estado === 'activo') {
      const ciclo = emp.cicloVentaDias || 30
      const diasAlerta = ciclo - 7
      if (diasDesdeUltimaInteraccion >= diasAlerta) {
        alertas.push({
          id: `ciclo-${emp.id}`,
          empresaId: emp.id,
          empresaNombre: emp.nombre,
          tipo: 'quiebre_stock',
          nivelSeveridad: diasDesdeUltimaInteraccion >= ciclo ? 'rojo' : 'amarillo',
          mensaje: `Ciclo de venta de ${ciclo} días. Inactivo hace ${diasDesdeUltimaInteraccion} días.`,
          accionRecomendada: 'Verificar pedido con el cliente.',
          fechaGeneracion: hoy.toISOString(),
          escaladaNivel2: diasDesdeUltimaInteraccion > (ciclo + 2),
          escaladaNivel1: diasDesdeUltimaInteraccion > (ciclo + 4)
        })
      }
    }

    // C. Cobranza: Factura vence en < 48 horas (2 días)
    const cobrosPendientes = cobranzasPendientes.filter(c => c.empresaId === emp.id)
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
            accionRecomendada: 'Comunícate para coordinar el pago o asienta la cobranza si ya pagó.',
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
          mensaje: `Cliente de baja hace ${diasDeBaja} días.`,
          accionRecomendada: 'Envíale una promoción o el catálogo nuevo para intentar recuperarlo.',
          fechaGeneracion: hoy.toISOString(),
          escaladaNivel2: false, // Las reactivaciones no suelen escalar punitivamente
          escaladaNivel1: false
        })
      }
    }
  }

  // Filtrado de escalado según RBAC
  return alertas.filter(a => {
    if (params.usuarioNivel === 1) return true // Gerencia ve TODO en esta vista
    if (params.usuarioNivel === 3) return true // Vendedor ve todo lo suyo
    if (params.usuarioNivel === 2) return a.escaladaNivel2 // Nivel 2 solo ve las escaladas a su nivel o mayor
    return false
  })
}
