import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Initializing zones...')
  
  // 1. Initial zones
  const defaultZones = ['CABA', 'SUR', 'NORTE', 'OESTE']
  for (const name of defaultZones) {
    const existing = await prisma.zona.findUnique({
      where: { nombre: name }
    })
    if (!existing) {
      await prisma.zona.create({
        data: { nombre: name }
      })
      console.log(`Created zone: ${name}`)
    } else {
      console.log(`Zone already exists: ${name}`)
    }
  }

  // 2. Set null zones in existing companies to CABA
  console.log('Updating companies without a zone assigned...')
  const updatedCompanies = await prisma.empresa.updateMany({
    where: {
      OR: [
        { zona: null },
        { zona: '' }
      ]
    },
    data: {
      zona: 'CABA'
    }
  })
  console.log(`Updated ${updatedCompanies.count} companies to zone "CABA".`)

  // 3. Update existing users to have default zones
  console.log('Updating existing users to have CABA enabled...')
  const users = await prisma.usuario.findMany()
  for (const user of users) {
    let zonesHabilitadas: string[] = []
    try {
      if (user.zonasHabilitadas) {
        zonesHabilitadas = JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}

    if (!zonesHabilitadas.includes('CABA')) {
      zonesHabilitadas.push('CABA')
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        zona: user.zona || 'CABA',
        zonasHabilitadas: zonesHabilitadas
      }
    })
    console.log(`Updated user ${user.alias} (Assigned: ${user.zona || 'CABA'}, Enabled: ${JSON.stringify(zonesHabilitadas)})`)
  }

  console.log('Data initialization complete.')
}

main()
  .catch(e => {
    console.error('Error running script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
