const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const pedidosMinusculas = await prisma.pedido.findMany({ where: { zona: 'Zona SUR' } });
  console.log('Pedidos en Zona SUR (minúsculas):', pedidosMinusculas.length);

  const empresasMinusculas = await prisma.empresa.findMany({ where: { zona: 'Zona SUR' } });
  console.log('Empresas en Zona SUR (minúsculas):', empresasMinusculas.length);

  const pedidosMayusculas = await prisma.pedido.findMany({ where: { zona: 'ZONA SUR' } });
  console.log('Pedidos en ZONA SUR (mayúsculas):', pedidosMayusculas.length);
}

check().finally(() => prisma.$disconnect());
