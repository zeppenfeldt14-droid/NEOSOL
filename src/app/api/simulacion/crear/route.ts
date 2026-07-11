import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

export async function POST() {
  try {
    const prefix = '[TEST]'
    const passwordHash = await bcrypt.hash('123456', 10)

    // Ensure Zones exist
    const zones = ['Zona SUR', 'Zona OESTE', 'Zona NORTE', 'Tucumán']
    for (const z of zones) {
      await prisma.zona.upsert({
        where: { nombre: z },
        update: {},
        create: { nombre: z }
      })
    }

    // Get Active Products
    const productos = await prisma.producto.findMany({ where: { activo: true } })
    if (productos.length === 0) {
      return NextResponse.json({ error: 'No hay productos para simular pedidos.' }, { status: 400 })
    }

    const configs = [
      { zona: 'Zona SUR', empCount: 25, multiplier: 1.5 },
      { zona: 'Zona OESTE', empCount: 15, multiplier: 1.2 },
      { zona: 'Zona NORTE', empCount: 10, multiplier: 0.8 },
      { zona: 'Tucumán', empCount: 10, multiplier: 0.8 },
    ]

    let totalUsuarios = 0
    let totalEmpresas = 0
    let totalPedidos = 0

    const currentYear = new Date().getFullYear()
    const firstDayOfYear = new Date(currentYear, 0, 1) // 1 de Enero
    const today = new Date()

    for (const conf of configs) {
      // 1. Create User
      const vendedor = await prisma.usuario.create({
        data: {
          nombre: `${prefix} Vendedor ${conf.zona}`,
          alias: `test_${conf.zona.toLowerCase().replace(' ', '')}`,
          email: `test_${conf.zona.toLowerCase().replace(' ', '')}@neosol.com`,
          passwordHash,
          nivel: 3,
          rol: 'Vendedor',
          activo: true,
          zona: conf.zona,
          limitesEstado: { horasObjetivo: 8, metasActivas: true, metaVentas: 50, metaNuevosClientes: 10, metaMonto: 5000000 * conf.multiplier }
        }
      })
      totalUsuarios++

      // 2. Create Companies
      for (let i = 1; i <= conf.empCount; i++) {
        const empresa = await prisma.empresa.create({
          data: {
            nombre: `${prefix} Empresa ${i} - ${conf.zona}`,
            zona: conf.zona,
            direccion: `Calle Ficticia ${randomInt(100, 9999)}`,
            telefono: `11${randomInt(10000000, 99999999)}`,
            responsable: `Contacto ${i}`,
            vendedorAsignado: vendedor.alias,
            estado: randomInt(1, 10) > 2 ? 'activo' : 'prospecto',
            creadoEn: randomDate(firstDayOfYear, today)
          }
        })
        totalEmpresas++

        // 3. Create Visits
        const numVisitas = randomInt(1, 3)
        for (let v = 0; v < numVisitas; v++) {
          await prisma.visita.create({
            data: {
              empresaId: empresa.id,
              fecha: randomDate(firstDayOfYear, today),
              tipo: 'visita',
              resultado: randomItem(['Pedido Cerrado', 'Rechazado', 'Reprogramar', 'Presupuesto Entregado']),
              notas: 'Simulación de visita generada automáticamente.'
            }
          })
        }

        // 4. Create Orders (Only if active)
        if (empresa.estado === 'activo') {
          const numPedidos = randomInt(1, 2)
          for (let p = 0; p < numPedidos; p++) {
            const prod1 = randomItem(productos)
            const prod2 = randomItem(productos)

            const cant1 = randomInt(5, 50) * conf.multiplier
            const cant2 = randomInt(5, 50) * conf.multiplier

            const randomMix = randomItem([
              { pA: 20, pB: 80, cond: '20/80' },
              { pA: 30, pB: 70, cond: '30/70' },
              { pA: 50, pB: 50, cond: '50/50' },
              { pA: 100, pB: 0, cond: '100% A' },
              { pA: 0, pB: 100, cond: '100% B' }
            ])
            const { pA, pB, cond } = randomMix

            const subtotal = (cant1 * prod1.precioCaja) + (cant2 * prod2.precioCaja)
            const montoA = subtotal * (pA / 100)
            const montoB = subtotal * (pB / 100)
            const montoIVA = montoA * 0.21

            const fechaTransaccion = randomDate(firstDayOfYear, today)

            const metodoPagoA = pA > 0 ? randomItem(['cheque', 'transferencia']) : null
            const fechaPagoA = new Date(fechaTransaccion)
            fechaPagoA.setDate(fechaPagoA.getDate() + randomItem([15, 30, 45, 60]))
            
            const metodoPagoB = pB > 0 ? randomItem(['efectivo', 'transferencia']) : null
            const fechaEntregaDate = new Date(fechaTransaccion)
            fechaEntregaDate.setDate(fechaEntregaDate.getDate() + randomItem([2, 5, 7]))
            const fechaEntregaStr = fechaEntregaDate.toISOString()

            // 3% recargo solo a B si es transferencia
            const recargoB = (metodoPagoB === 'transferencia') ? montoB * 0.03 : 0
            const total = subtotal + montoIVA + recargoB

            const pedido = await prisma.pedido.create({
              data: {
                numeroPedido: `PED-SIM-${conf.zona.substring(0, 3)}-${randomInt(1000, 9999)}`,
                empresaId: empresa.id,
                vendedorId: vendedor.id,
                vendedorAlias: vendedor.alias,
                zona: conf.zona,
                estado: randomItem(['aprobado', 'aprobado', 'aprobado', 'aprobado', 'pendiente_aprobacion', 'borrador']),
                porcentajePagoA: pA,
                porcentajePagoB: pB,
                metodoPagoA,
                fechaPagoA: pA > 0 ? fechaPagoA : null,
                metodoPagoB,
                fechaEntrega: fechaEntregaStr,
                subtotalSinIVA: subtotal,
                montoIVA: montoIVA,
                montoFinanciera: recargoB,
                totalGeneral: total,
                condicionPago: cond,
                creadoEn: fechaTransaccion,
                detalles: {
                  create: [
                    {
                      productoId: prod1.id,
                      productoNombre: prod1.nombre,
                      precioCajaSnapshot: prod1.precioCaja,
                      precioPaqSnapshot: prod1.precioPaquete,
                      paqPorCajaSnapshot: prod1.paqPorCaja,
                      cantidadCajas: Math.floor(cant1),
                      subtotal: Math.floor(cant1) * prod1.precioCaja
                    },
                    {
                      productoId: prod2.id,
                      productoNombre: prod2.nombre,
                      precioCajaSnapshot: prod2.precioCaja,
                      precioPaqSnapshot: prod2.precioPaquete,
                      paqPorCajaSnapshot: prod2.paqPorCaja,
                      cantidadCajas: Math.floor(cant2),
                      subtotal: Math.floor(cant2) * prod2.precioCaja
                    }
                  ]
                }
              }
            })
            totalPedidos++

            // Solo generamos Factura A y B si está aprobado
            if (pedido.estado === 'aprobado') {
              // Simular Factura A
              if (pA > 0) {
              await prisma.factura.create({
                data: {
                  pedidoId: pedido.id,
                  numeroFactura: `FAC-A-${randomInt(1000, 9999)}`,
                  tipo: 'A',
                  subtotal: montoA,
                  iva: montoIVA,
                  recargo: 0,
                  total: montoA + montoIVA,
                  estado: 'pendiente',
                  creadoEn: fechaTransaccion
                }
              })
              
              const saldoPendienteA = randomItem([0, montoA + montoIVA])
              let estadoCobA = saldoPendienteA === 0 ? 'pagada' : 'pendiente'
              if (saldoPendienteA > 0 && fechaPagoA < new Date()) estadoCobA = 'vencida'

              await prisma.cobranza.create({
                data: {
                  pedidoId: pedido.id,
                  empresaId: empresa.id,
                  empresaNombre: empresa.nombre,
                  vendedorAlias: vendedor.alias,
                  zona: conf.zona,
                  montoOriginal: montoA + montoIVA,
                  saldoPendiente: saldoPendienteA,
                  estado: estadoCobA,
                  fechaVencimiento: fechaPagoA,
                  tipoFactura: 'A',
                  metodoPago: metodoPagoA,
                  creadoEn: fechaTransaccion
                }
              })
            }

            // Simular Factura B
            if (pB > 0) {
              await prisma.factura.create({
                data: {
                  pedidoId: pedido.id,
                  numeroFactura: `FAC-B-${randomInt(1000, 9999)}`,
                  tipo: 'B',
                  subtotal: montoB,
                  iva: 0,
                  recargo: recargoB,
                  total: montoB + recargoB,
                  estado: 'pendiente',
                  creadoEn: fechaTransaccion
                }
              })

              const saldoPendienteB = randomItem([0, montoB + recargoB])
              let estadoCobB = saldoPendienteB === 0 ? 'pagada' : 'pendiente'
              if (saldoPendienteB > 0 && fechaEntregaDate < new Date()) estadoCobB = 'vencida'

              await prisma.cobranza.create({
                data: {
                  pedidoId: pedido.id,
                  empresaId: empresa.id,
                  empresaNombre: empresa.nombre,
                  vendedorAlias: vendedor.alias,
                  zona: conf.zona,
                  montoOriginal: montoB + recargoB,
                  saldoPendiente: saldoPendienteB,
                  estado: estadoCobB,
                  fechaVencimiento: fechaEntregaDate,
                  tipoFactura: 'B',
                  metodoPago: metodoPagoB,
                  creadoEn: fechaTransaccion
                }
              })
              }
            } // Fin de if(estado === 'aprobado')
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Simulación completada con éxito.',
      data: { usuarios: totalUsuarios, empresas: totalEmpresas, pedidos: totalPedidos }
    })

  } catch (error: any) {
    console.error('Simulation Creation Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
