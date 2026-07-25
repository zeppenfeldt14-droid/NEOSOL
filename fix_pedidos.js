const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: 'pendiente_supervisor' },
    include: { detalles: { include: { producto: true } } }
  });

  console.log(`Encontrados ${pedidos.length} pedidos pendientes de supervisor.`);

  const activeList = await prisma.listaPrecio.findFirst({
    where: { activa: true },
    orderBy: { vigenteDesde: 'desc' },
    include: { precios: true }
  });

  if (!activeList) {
    console.error("No hay lista activa.");
    return;
  }

  let actualizados = 0;

  for (const pedido of pedidos) {
    let countListaA = 0;
    let tienePrecioNegociado = false;
    let tieneTarifaNegociada = false;

    const totalCajas = pedido.detalles.reduce((sum, d) => sum + (d.cantidadCajas || 0), 0);
    const totalProductos = pedido.detalles.length;

    for (const d of pedido.detalles) {
      const prod = d.producto;
      if (!prod) continue;

      const priceRecord = activeList.precios.find(pr => pr.productoId === prod.id);
      const priceA = priceRecord ? priceRecord.precioCajaMax : prod.precioCaja;
      const priceB = priceRecord ? priceRecord.precioCajaMin : prod.precioCaja;

      const customPrice = parseFloat(d.precioCajaSnapshot);
      const isListA = Math.abs(customPrice - priceA) < 0.01;
      const isListB = Math.abs(customPrice - priceB) < 0.01;
      const hasCustomPrice = !isNaN(customPrice) && !isListA && !isListB;

      if (hasCustomPrice) {
        tienePrecioNegociado = true;
      }

      if (isListA) {
        countListaA++;
      }
    }

    if (totalCajas < 300) {
      const porcentajeListaA = totalProductos > 0 ? (countListaA / totalProductos) * 100 : 0;
      if (porcentajeListaA >= 60) {
        tienePrecioNegociado = true;
      } else if (porcentajeListaA > 0) {
        tieneTarifaNegociada = true;
      }
    }

    // Actualizar en BD solo si cambiaron
    if (pedido.tienePrecioNegociado !== tienePrecioNegociado || pedido.tieneTarifaNegociada !== tieneTarifaNegociada) {
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          tienePrecioNegociado,
          tieneTarifaNegociada
        }
      });
      actualizados++;
      console.log(`Pedido ${pedido.numeroPedido} (ID: ${pedido.id}) actualizado: tienePrecioNegociado=${tienePrecioNegociado}, tieneTarifaNegociada=${tieneTarifaNegociada}, %ListaA=${(countListaA/totalProductos)*100}`);
    } else {
      console.log(`Pedido ${pedido.numeroPedido} (ID: ${pedido.id}) SIN CAMBIOS.`);
    }
  }

  console.log(`Total de pedidos actualizados: ${actualizados}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
