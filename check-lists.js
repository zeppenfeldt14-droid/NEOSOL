const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const productos = await prisma.producto.findMany({
    where: { codigoInterno: { in: ['66034', '99001'] } }
  });
  
  const listas = await prisma.listaPrecio.findMany({
    where: { activa: true },
    orderBy: { vigenteDesde: 'desc' },
    include: { precios: true }
  });
  
  listas.forEach(l => {
    console.log('\nLista ID: ' + l.id + ' | Vigente Desde: ' + l.vigenteDesde);
    for (const prod of productos) {
      const priceRecord = l.precios.find(pr => pr.productoId === prod.id);
      console.log('  Prod ' + prod.codigoInterno + ' (' + prod.nombre + ') -> Max (A): ' + (priceRecord ? priceRecord.precioCajaMax : prod.precioCaja) + ', Min (B): ' + (priceRecord ? priceRecord.precioCajaMin : prod.precioCaja));
    }
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
