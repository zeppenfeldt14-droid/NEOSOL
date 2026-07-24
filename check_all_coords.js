const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.empresa.count();
  const withCoords = await prisma.empresa.count({ where: { latitud: { not: null }, longitud: { not: null } } });
  const missingCoords = await prisma.empresa.count({ where: { OR: [{ latitud: null }, { longitud: null }] } });
  
  const cabaTotal = await prisma.empresa.count({ where: { zona: 'CABA' } });
  const cabaWithCoords = await prisma.empresa.count({ where: { zona: 'CABA', latitud: { not: null }, longitud: { not: null } } });
  const cabaMissingCoords = await prisma.empresa.count({ where: { zona: 'CABA', OR: [{ latitud: null }, { longitud: null }] } });

  console.log(`Total Empresas: ${total}`);
  console.log(`With Coords: ${withCoords}`);
  console.log(`Missing Coords: ${missingCoords}`);
  console.log(`---------------------------------`);
  console.log(`CABA Total Empresas: ${cabaTotal}`);
  console.log(`CABA With Coords: ${cabaWithCoords}`);
  console.log(`CABA Missing Coords: ${cabaMissingCoords}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
