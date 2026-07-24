const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.zona.update({
    where: { nombre: 'CABA' },
    data: {
      barrios: [],
      geojson: null
    }
  })
  console.log('CABA zone cleared.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
