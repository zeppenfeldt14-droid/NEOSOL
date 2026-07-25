const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nums = ['PED-2026-0037', 'PED-2026-0040', 'PED-2026-0042', 'PED-2026-0043'];
  
  // Get active lists to properly evaluate
  const config = await prisma.configuracionSistema.findUnique({ where: { clave: 'promociones_activas' } });
  let activeListId = null;
  if (config) {
    const val = JSON.parse(config.valor);
    activeListId = val.listaEstandarId;
  }
  
  let priceRecords = [];
  if (activeListId) {
    priceRecords = await prisma.precioLista.findMany({
      where: { listaPrecioId: activeListId }
    });
  }
  
  for (const num of nums) {
    const pedido = await prisma.pedido.findFirst({
      where: { numeroPedido: num },
      include: { detalles: true }
    });

    if (!pedido) {
      console.log(`\n=== ${num} NO ENCONTRADO ===`);
      continue;
    }

    console.log(`\n=== PEDIDO: ${num} ===`);
    console.log(`Estado Actual: ${pedido.estado}`);
    console.log(`tienePrecioNegociado (Actual): ${pedido.tienePrecioNegociado}`);
    
    let hasRealCustomPrice = false;
    let hasDifferentList = false;
    
    console.log(`Detalles:`);
    for (const d of pedido.detalles) {
      let isCustom = false;
      
      const pRecord = priceRecords.find(pr => pr.productoId === d.productoId);
      if (pRecord) {
         const isListA = Math.abs(parseFloat(d.precioCajaSnapshot) - parseFloat(pRecord.precioCajaMax)) < 0.01;
         const isListB = Math.abs(parseFloat(d.precioCajaSnapshot) - parseFloat(pRecord.precioCajaMin)) < 0.01;
         isCustom = !isListA && !isListB;
      }
      
      const isDiff = Math.abs(parseFloat(d.precioCajaSnapshot) - parseFloat(d.precioCajaOriginal)) > 0.01;
      
      if (isDiff) {
        if (isCustom) hasRealCustomPrice = true;
        else hasDifferentList = true;
      }
      
      console.log(`  - Prod ID ${d.productoId} | Snap: ${d.precioCajaSnapshot} | Orig: ${d.precioCajaOriginal} | Diff: ${isDiff} | Custom: ${isCustom}`);
    }
    
    console.log(`\n  >> EVALUACION NUEVAS REGLAS:`);
    console.log(`  >> Tiene precios 100% custom? ${hasRealCustomPrice}`);
    console.log(`  >> Tiene cruce de listas A/B? ${hasDifferentList}`);
    
    const shouldBeNegociado = hasRealCustomPrice; // true if it requires approval (Cambio de Tarifa)
    console.log(`  >> Deberia tener tienePrecioNegociado = ${shouldBeNegociado}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
