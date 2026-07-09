import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ventas = await prisma.visita.findMany({
    where: { resultado: 'venta' },
    include: { empresa: true }
  })
  console.log('Visitas con resultado venta:')
  ventas.forEach(v => {
    console.log(`- ID: ${v.id} | Empresa: ${v.empresa.nombre} | Fecha: ${v.fecha} | Tipo: ${v.tipo}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
