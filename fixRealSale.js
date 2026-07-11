const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresaId = 13; // Mar y Mar

  // Delete previous botched order(s) for Mar y Mar
  const previousOrders = await prisma.pedido.findMany({
    where: { empresaId: 13, numeroPedido: 'PED-1005' }
  });
  
  for (const order of previousOrders) {
    await prisma.detallePedido.deleteMany({ where: { pedidoId: order.id } });
    await prisma.factura.deleteMany({ where: { pedidoId: order.id } });
    await prisma.cobranza.deleteMany({ where: { pedidoId: order.id } });
    await prisma.pedido.delete({ where: { id: order.id } });
  }

  const producto = await prisma.producto.findFirst();
  const fechaVenta = new Date('2026-06-18T10:00:00Z');

  // Totals
  const subtotalA = 712807.81;
  const ivaA = 149689.64;
  const totalA = 862497.45;

  const subtotalB = 728114.92;
  const ivaB = 0;
  const totalB = 728114.92;

  const subtotalGeneral = subtotalA + subtotalB;
  const totalGeneral = totalA + totalB;

  const pctA = (totalA / totalGeneral) * 100;
  const pctB = (totalB / totalGeneral) * 100;

  // Create new order for Mar y Mar
  const pedido = await prisma.pedido.create({
    data: {
      numeroPedido: 'PED-1005',
      empresaId: 13,
      zona: 'CABA',
      vendedorId: 1,
      vendedorAlias: 'Elarez',
      estado: 'aprobado',
      condicionPago: 'Contra Entrega',
      porcentajePagoA: pctA,
      porcentajePagoB: pctB,
      aplicaFinanciera: false,
      requierePresupuesto: false,
      metodoPagoA: 'transferencia',
      fechaPagoA: fechaVenta.toISOString(),
      metodoPagoB: 'efectivo',
      fechaEntrega: fechaVenta.toISOString(),
      aprobadoPorId: 1,
      aprobadoPorAlias: 'Admin',
      aprobadoEn: fechaVenta,
      subtotalSinIVA: subtotalGeneral,
      montoIVA: ivaA,
      montoFinanciera: 0,
      totalGeneral: totalGeneral,
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
      detalles: {
        create: [
          {
            productoId: producto.id,
            productoNombre: "Surtido de Productos (Según Facturas)",
            cantidadCajas: 121, // 60 from A, 61 from X
            precioCajaOriginal: subtotalGeneral / 121,
            precioCajaSnapshot: subtotalGeneral / 121,
            precioPaqSnapshot: 0,
            paqPorCajaSnapshot: 0,
            cajasBonus: 0,
            subtotal: subtotalGeneral
          }
        ]
      }
    }
  });

  const año = fechaVenta.getFullYear();
  const baseNum = pedido.id;
  
  // Factura A
  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: `FAC-A-${año}-${String(baseNum).padStart(4, '0')}`,
      tipo: 'A',
      subtotal: subtotalA,
      iva: ivaA,
      recargo: 0,
      total: totalA,
      estado: 'pendiente',
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
    }
  });
  
  await prisma.cobranza.create({
    data: {
      pedidoId: pedido.id,
      empresaId: 13,
      empresaNombre: 'Distribuidora Mar y Mar Golosinas',
      vendedorAlias: 'Elarez',
      zona: 'CABA',
      montoOriginal: totalA,
      saldoPendiente: totalA,
      cuota: 1,
      totalCuotas: 1,
      estado: 'pendiente',
      fechaVencimiento: fechaVenta,
      tipoFactura: 'A',
      metodoPago: 'transferencia',
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
    }
  });

  // Factura B / X
  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: `FAC-B-${año}-${String(baseNum).padStart(4, '0')}`,
      tipo: 'B',
      subtotal: subtotalB,
      iva: ivaB,
      recargo: 0,
      total: totalB,
      estado: 'pendiente',
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
    }
  });

  await prisma.cobranza.create({
    data: {
      pedidoId: pedido.id,
      empresaId: 13,
      empresaNombre: 'Distribuidora Mar y Mar Golosinas',
      vendedorAlias: 'Elarez',
      zona: 'CABA',
      montoOriginal: totalB,
      saldoPendiente: totalB,
      cuota: 1,
      totalCuotas: 1,
      estado: 'pendiente',
      fechaVencimiento: fechaVenta,
      tipoFactura: 'B',
      metodoPago: 'efectivo',
      creadoEn: fechaVenta,
      actualizadoEn: fechaVenta,
    }
  });

  console.log("Venta REAL cargada con éxito!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
