const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const d = await p.pedido.findFirst({where: {numeroPedido: 'PED-2026-0044'}, include: {detalles: true}});
  console.log(d);
}
run().finally(() => p.$disconnect());
