const d = {
  productoId: 2,
  precioCajaSnapshot: 14319.36,
  precioCajaOriginal: 16591.34
};

async function run() {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  const list = await p.listaPrecio.findFirst({where: {activa: true}, include: {precios: true}});
  
  if (list) {
    const pRecord = list.precios.find(pr => pr.productoId === d.productoId);
    console.log("pRecord:", !!pRecord);
    if (pRecord) {
        console.log("pRecord.precioCajaMax type:", typeof pRecord.precioCajaMax);
    }
  }
}
run();
