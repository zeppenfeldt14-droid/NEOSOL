import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Migrating all existing companies to CABA...')
  
  const result = await prisma.empresa.updateMany({
    data: {
      zona: 'CABA'
    }
  })
  
  console.log(`Successfully migrated ${result.count} companies to CABA.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
