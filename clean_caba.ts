import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpieza y reasignación en CABA...');

  // 1. Eliminar empresas de "Ezeppen" en CABA
  const deleted = await prisma.empresa.deleteMany({
    where: {
      zona: 'CABA',
      vendedorAsignado: 'Ezeppen',
    },
  });
  console.log(`Eliminadas ${deleted.count} empresas de "Ezeppen" en CABA.`);

  // 2. Reasignar empresas de "Ernesto Lares" a "Elarez" en CABA
  const updatedErnesto = await prisma.empresa.updateMany({
    where: {
      zona: 'CABA',
      vendedorAsignado: 'Ernesto Lares',
    },
    data: {
      vendedorAsignado: 'Elarez',
    },
  });
  console.log(`Reasignadas ${updatedErnesto.count} empresas de "Ernesto Lares" a "Elarez".`);

  // 3. Reasignar empresas "Sin vendedor" a "Elarez" en CABA
  const updatedSinVendedor = await prisma.empresa.updateMany({
    where: {
      zona: 'CABA',
      OR: [
        { vendedorAsignado: null },
        { vendedorAsignado: '' }
      ]
    },
    data: {
      vendedorAsignado: 'Elarez',
    },
  });
  console.log(`Reasignadas ${updatedSinVendedor.count} empresas sin vendedor a "Elarez".`);

  console.log('Proceso completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
