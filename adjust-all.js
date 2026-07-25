const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pedidos = await prisma.pedido.findMany({
    where: {
      estado: { in: ['borrador', 'pendiente_supervisor'] }
    },
    include: {
      detalles: true
    }
  });

  const activeList = await prisma.listaPrecio.findFirst({
    where: { activa: true, vigenteDesde: { lte: new Date() } },
    orderBy: { vigenteDesde: 'desc' },
    include: { precios: true }
  });
  
  if (!activeList) {
    console.log("No active list found");
    return;
  }
  
  const priceRecords = activeList.precios;

  for (const pedido of pedidos) {
    let tienePrecioNegociado = false;
    let tieneTarifaNegociada = false;
    let tieneModificacionEspecial = false;
    
    // Check if it has payment condition changed
    if (pedido.condicionPago && pedido.condicionPago !== '30% / 70%') {
      tieneModificacionEspecial = true;
    }
    
    let allListA = true;
    const totalCajas = pedido.detalles.reduce((sum, d) => sum + (d.cantidadCajas || 0), 0);
    
    for (const d of pedido.detalles) {
      const pRecord = priceRecords.find(pr => pr.productoId === d.productoId);
      if (!pRecord) continue;
      
      const customPrice = parseFloat(d.precioCajaSnapshot);
      const isListA = Math.abs(customPrice - parseFloat(pRecord.precioCajaMax)) < 0.01;
      const isListB = Math.abs(customPrice - parseFloat(pRecord.precioCajaMin)) < 0.01;
      
      if (!isListA) allListA = false;
      if (!isListA && !isListB) {
        tienePrecioNegociado = true;
      }
    }
    
    if (allListA && totalCajas < 300) {
      tieneTarifaNegociada = true;
    }

    const finalTarifa = tieneTarifaNegociada || tieneModificacionEspecial;

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        tienePrecioNegociado,
        tieneTarifaNegociada: finalTarifa, 
      }
    });
    console.log(`Updated ${pedido.numeroPedido}: tienePrecioNegociado=${tienePrecioNegociado}, allListA=${allListA}, tieneTarifaNegociada=${finalTarifa}`);
  }
}

main().finally(() => prisma.$disconnect());
