async function run() {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  const list = await p.listaPrecio.findFirst({where: {activa: true}, include: {precios: true}});
  
  if (list) {
    const pRecord = list.precios.find(x => x.productoCodigo === '33077');
    console.log("DULCE:", pRecord);
  }
}
run();
