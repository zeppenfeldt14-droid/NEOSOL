const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const zonas = await prisma.empresa.findMany({
    select: { zona: true, subZona: true },
    distinct: ['zona', 'subZona']
  })
  
  console.log('Distinct Zonas/Subzonas:');
  for (const z of zonas) {
    console.log(`Zona: ${z.zona} | SubZona: ${z.subZona}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
