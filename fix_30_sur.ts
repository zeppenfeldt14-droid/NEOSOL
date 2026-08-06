import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando corrección de empresas en ZONA SUR...');

  // Buscar las últimas 30 empresas cargadas en ZONA SUR sin vendedor
  const empresas = await prisma.empresa.findMany({
    where: {
      zona: 'ZONA SUR'
    },
    orderBy: {
      creadoEn: 'desc'
    },
    take: 30
  });

  console.log(`Se encontraron ${empresas.length} empresas recientes en ZONA SUR.`);

  const ids = empresas.map((e) => e.id);

  if (ids.length > 0) {
    const updateResult = await prisma.empresa.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: {
        vendedorAsignado: 'Ddilerna'
      }
    });

    console.log(`Se actualizaron ${updateResult.count} empresas, asignando el vendedor 'Ddilerna'.`);
  } else {
    console.log('No hay empresas que actualizar.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
