const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const d = await p.pedido.findFirst({where: {numeroPedido: 'PED-2026-0045'}, include: {detalles: {include: {producto: true}}}});
  console.log(JSON.stringify(d, null, 2));
}
run().finally(() => p.$disconnect());
