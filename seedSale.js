const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresaId = 10; // Dulsisa Golosinas
  
  // Set empresa as activo
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { estado: 'activo' }
  });

  const producto = await prisma.producto.findFirst();
  if (!producto) {
    console.log("No hay productos");
    return;
  }

  const fechaVenta = new Date('2026-06-18T10:00:00Z');

  // Create Pedido
  const pedido = await prisma.pedido.create({
    data: {
      numeroPedido: 'PED-1005',
      empresaId: empresaId,
      zona: 'CABA',
      vendedorId: 1,
      vendedorAlias: 'Elarez',
      estado: 'aprobado',
      condicionPago: 'Contra Entrega',
      porcentajePagoA: 60,
      porcentajePagoB: 40,
      aplicaFinanciera: false,
      requierePresupuesto: false,
      metodoPagoA: 'transferencia',
      fechaPagoA: fechaVenta.toISOString(),
      metodoPagoB: 'efectivo',
      fechaEntrega: fechaVenta.toISOString(),
      aprobadoPorId: 1, // asumiendo que hay usuario 1
      aprobadoPorAlias: 'Admin',
      aprobadoEn: fechaVenta,
      subtotalSinIVA: 100000,
      montoIVA: 12600, // 21% de 60.000
      montoFinanciera: 0,
      totalGeneral: 112600,
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
      detalles: {
        create: [
          {
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidadCajas: 10,
            precioCajaOriginal: 10000,
            precioCajaSnapshot: 10000,
            precioPaqSnapshot: 1000,
            paqPorCajaSnapshot: 10,
            cajasBonus: 0,
            subtotal: 100000
          }
        ]
      }
    }
  });

  // Create Facturas
  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: 'FAC-A-2026-0105',
      tipo: 'A',
      subtotal: 60000,
      iva: 12600,
      recargo: 0,
      total: 72600,
      estado: 'pagada',
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
      pagos: {
        create: {
          monto: 72600,
          metodo: 'transferencia',
          fecha: fechaVenta,
          notas: 'Pago simulado'
        }
      }
    }
  });

  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: 'FAC-B-2026-0106',
      tipo: 'B',
      subtotal: 40000,
      iva: 0,
      recargo: 0,
      total: 40000,
      estado: 'pagada',
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
      pagos: {
        create: {
          monto: 40000,
          metodo: 'efectivo',
          fecha: fechaVenta,
          notas: 'Pago simulado'
        }
      }
    }
  });

  console.log("Venta de junio registrada con éxito!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
