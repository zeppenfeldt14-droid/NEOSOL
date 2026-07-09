import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const zona7 = await prisma.empresa.findMany({
    where: { zona: 'ZONA 7' },
    include: {
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 1
      }
    }
  })

  console.log(`Empresas en ZONA 7: ${zona7.length}`)
  zona7.forEach(emp => {
    const ultima = emp.visitas[0]?.fecha
    console.log(`- ${emp.nombre} | Estado: ${emp.estado} | Ciclo Venta: ${emp.cicloVentaDias} | Última Visita: ${ultima ? ultima.toISOString() : 'Ninguna'}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
