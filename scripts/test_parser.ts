import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rep = await prisma.reporteVisitas.findFirst({where: {zona: 'Histórico'}})
  if (rep) {
    const datos = JSON.parse(rep.datosJSON)
    console.log("=== NOTAS EJEMPLO ===")
    console.log(datos.visitas[0].notas)
    console.log("=====================")
  }
}

main().finally(() => prisma.$disconnect())
