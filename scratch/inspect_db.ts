import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Database Inspection ===')
  
  const totalEmpresas = await prisma.empresa.count()
  console.log(`Total companies: ${totalEmpresas}`)

  const distinctZones = await prisma.empresa.groupBy({
    by: ['zona'],
    _count: {
      _all: true
    }
  })
  console.log('Unique zones in Empresa table:')
  console.log(distinctZones)

  const distinctUserZones = await prisma.usuario.findMany({
    select: {
      alias: true,
      nivel: true,
      zona: true,
      zonasHabilitadas: true
    }
  })
  console.log('Users and their assigned/enabled zones:')
  console.log(distinctUserZones)

  const totalZones = await prisma.zona.findMany()
  console.log('Zones in Zona table:')
  console.log(totalZones)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
