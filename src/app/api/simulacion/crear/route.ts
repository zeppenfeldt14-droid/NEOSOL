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

            const subtotal = (cant1 * prod1.precioCaja) + (cant2 * prod2.precioCaja)
            const montoIVA = subtotal * 0.2 * 0.21 // 20% Factura A -> 21% IVA
            const total = subtotal + montoIVA

            const fechaTransaccion = randomDate(firstDayOfYear, today)

            const pedido = await prisma.pedido.create({
              data: {
                numeroPedido: `PED-SIM-${conf.zona.substring(0, 3)}-${randomInt(1000, 9999)}`,
                empresaId: empresa.id,
                vendedorId: vendedor.id,
                vendedorAlias: vendedor.alias,
                zona: conf.zona,
                estado: 'aprobado',
                porcentajePagoA: 20,
                porcentajePagoB: 80,
                subtotalSinIVA: subtotal,
                montoIVA: montoIVA,
                totalGeneral: total,
                condicionPago: '20/80',
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

            // 5. Facturas y Cobranzas
            await prisma.factura.create({
              data: {
                pedidoId: pedido.id,
                numeroFactura: `FAC-SIM-${randomInt(1000, 9999)}`,
                tipo: 'A',
                subtotal: subtotal * 0.2,
                iva: montoIVA,
                total: (subtotal * 0.2) + montoIVA,
                estado: 'pagada',
                creadoEn: fechaTransaccion
              }
            })

            await prisma.cobranza.create({
              data: {
                pedidoId: pedido.id,
                empresaId: empresa.id,
                empresaNombre: empresa.nombre,
                vendedorAlias: vendedor.alias,
                zona: conf.zona,
                montoOriginal: total,
                saldoPendiente: randomItem([0, total * 0.5, total]), // Pagado, Parcial o Pendiente
                estado: 'pendiente',
                creadoEn: fechaTransaccion
              }
            })
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
