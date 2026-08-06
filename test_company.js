const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emps = await prisma.empresa.findMany({
    where: {
      nombre: {
        contains: 'MAYORISTA DE GOLOSINAS 12 DE OCTUBRE',
        mode: 'insensitive'
      }
    },
    select: {
      id: true,
      nombre: true,
      estado: true,
      creadoEn: true,
      direccion: true,
      telefono: true
    }
  });
  console.log(JSON.stringify(emps, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
