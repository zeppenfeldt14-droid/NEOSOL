const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Fetching pedidos...');
  const pedidos = await prisma.pedido.findMany();
  const promos = await prisma.promocion.findMany();
  
  if (promos.length === 0) {
    console.log('No promos found in database.');
    return;
  }
  
  let count = 0;
  for (const p of pedidos) {
    // Solo asignar promos si no tiene y asignar a un ~40% de los pedidos aleatoriamente
    if (!p.promocionId && Math.random() < 0.4) {
      const randomPromo = promos[Math.floor(Math.random() * promos.length)];
      await prisma.pedido.update({
        where: { id: p.id },
        data: { promocionId: randomPromo.id }
      });
      count++;
    }
  }
  
  console.log(`Updated ${count} pedidos with promos successfully.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
