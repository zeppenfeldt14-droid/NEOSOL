const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const pedidos = await prisma.pedido.findMany({
    where: { zona: 'ZONA SUR' }
  });
  console.log('Pedidos en ZONA SUR:', pedidos.length);
  
  const pedidosMes = await prisma.pedido.findMany({
    where: { 
        zona: 'ZONA SUR',
        creadoEn: {
            gte: new Date('2026-07-01'),
            lt: new Date('2026-08-01')
        }
    }
  });
  console.log('Pedidos en ZONA SUR (Julio):', pedidosMes.length);

  const empresas = await prisma.empresa.findMany({
    where: { zona: 'ZONA SUR' }
  });
  console.log('Empresas en ZONA SUR:', empresas.length);
}

check().finally(() => prisma.$disconnect());
