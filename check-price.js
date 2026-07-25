const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const productos = await prisma.producto.findMany({
    where: { codigoInterno: { in: ['66034', '99001'] } }
  });
  
  const activeList = await prisma.listaPrecio.findFirst({
    where: { activa: true },
    orderBy: { vigenteDesde: 'desc' },
    include: { precios: true }
  });
  
  for (const prod of productos) {
    const priceRecord = activeList.precios.find(pr => pr.productoId === prod.id);
    console.log(prod.codigoInterno + ' ' + prod.nombre);
    console.log(' -> Lista A (Max): ' + (priceRecord ? priceRecord.precioCajaMax : prod.precioCaja));
    console.log(' -> Lista B (Min): ' + (priceRecord ? priceRecord.precioCajaMin : prod.precioCaja));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
