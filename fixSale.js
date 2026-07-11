const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Revert Dulsisa
  await prisma.empresa.update({
    where: { id: 10 },
    data: { estado: 'prospecto' }
  });

  // Ensure Mar y Mar is activo
  await prisma.empresa.update({
    where: { id: 13 },
    data: { estado: 'activo' }
  });

  // Delete previous botched order
  await prisma.detallePedido.deleteMany({ where: { pedidoId: 146 } });
  await prisma.pedido.delete({ where: { id: 146 } });

  const producto = await prisma.producto.findFirst();
  const fechaVenta = new Date('2026-06-18T10:00:00Z');

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
      porcentajePagoA: 50, // Let's put 50% A, 50% B to match user saying both
      porcentajePagoB: 50,
      aplicaFinanciera: false,
      requierePresupuesto: false,
      metodoPagoA: 'transferencia',
      fechaPagoA: fechaVenta.toISOString(),
      metodoPagoB: 'efectivo',
      fechaEntrega: fechaVenta.toISOString(),
      aprobadoPorId: 1,
      aprobadoPorAlias: 'Admin',
      aprobadoEn: fechaVenta,
      subtotalSinIVA: 100000,
      montoIVA: 10500, // 21% de 50.000
      montoFinanciera: 0,
      totalGeneral: 110500,
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

  // Create Facturas and Cobranzas manually matching the logic in route.ts
  const año = fechaVenta.getFullYear();
  const baseNum = pedido.id;
  
  // Factura A
  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: `FAC-A-${año}-${String(baseNum).padStart(4, '0')}`,
      tipo: 'A',
      subtotal: 50000,
      iva: 10500,
      recargo: 0,
      total: 60500,
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
      montoOriginal: 60500,
      saldoPendiente: 60500,
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

  // Factura B
  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: `FAC-B-${año}-${String(baseNum).padStart(4, '0')}`,
      tipo: 'B',
      subtotal: 50000,
      iva: 0,
      recargo: 0,
      total: 50000,
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
      montoOriginal: 50000,
      saldoPendiente: 50000,
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

  console.log("Venta corregida y re-asignada a Mar y Mar con éxito!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
