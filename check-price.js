const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const prod = await p.producto.findFirst({where: {nombre: {contains: 'SANDW. 176'}}});
  console.log('Producto:', prod);
  
  const list = await p.listaPrecio.findFirst({
    where: {activa: true, vigenteDesde: {lte: new Date()}},
    orderBy: {vigenteDesde: 'desc'},
    include: {precios: true}
  });
  
  const pr = list.precios.find(x => x.productoId === prod.id);
  console.log('Max (A):', pr ? pr.precioCajaMax : 'Not found');
  console.log('Min (B):', pr ? pr.precioCajaMin : 'Not found');
  console.log('Original prod.precioCaja:', prod.precioCaja);
  
  const d = await p.pedido.findFirst({where: {numeroPedido: 'PED-2026-0044'}, include: {detalles: true}});
  const det = d.detalles.find(x => x.productoId === prod.id);
  console.log('PED-0044 SANDW. 176 snapshot:', det.precioCajaSnapshot);
  console.log('PED-0044 SANDW. 176 original:', det.precioCajaOriginal);
}
run().finally(() => p.$disconnect());
