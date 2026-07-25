const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.pedido.findFirst({where: {numeroPedido: 'PED-2026-0041'}});
  console.log(p);
  
  // If payment condition was forcing it, I will clear it
  await prisma.pedido.update({
    where: {numeroPedido: 'PED-2026-0041'},
    data: { tieneTarifaNegociada: false }
  });
  
  await prisma.pedido.update({
    where: {numeroPedido: 'PED-2026-0044'},
    data: { tieneTarifaNegociada: false }
  });
}
main().finally(() => prisma.$disconnect());
