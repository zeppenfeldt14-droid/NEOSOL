import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Updating all companies in the database to be assigned to vendedor 'Elarez'...")
  
  const result = await prisma.empresa.updateMany({
    data: {
      vendedorAsignado: 'Elarez'
    }
  })

  console.log(`Successfully updated ${result.count} companies.`)

  // Also verify they have a valid zone. If zone is empty, set it to CABA
  const emptyZoneCompanies = await prisma.empresa.findMany({
    where: {
      OR: [
        { zona: null },
        { zona: '' }
      ]
    }
  })

  console.log(`Found ${emptyZoneCompanies.length} companies with empty zones. Setting them to CABA...`)
  
  if (emptyZoneCompanies.length > 0) {
    const zoneResult = await prisma.empresa.updateMany({
      where: {
        id: {
          in: emptyZoneCompanies.map(c => c.id)
        }
      },
      data: {
        zona: 'CABA'
      }
    })
    console.log(`Updated ${zoneResult.count} companies to zone 'CABA'.`)
  }
}

main()
  .catch(e => {
    console.error("Error updating companies:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
