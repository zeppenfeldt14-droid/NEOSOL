const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.empresa.count({where: {estado: 'prospecto'}});
  console.log('Prospectos count:', count);
  const recents = await prisma.empresa.findMany({
    where: {estado: 'prospecto'},
    orderBy: {id: 'desc'},
    take: 5
  });
  console.log('Recientes:', recents);
}

main().finally(() => prisma.$disconnect());
