import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando corrección de estados...');

  const updated = await prisma.empresa.updateMany({
    where: {
      zona: 'CABA',
      vendedorAsignado: 'Elarez',
      estado: 'Activo',
      nombre: {
        not: {
          contains: 'Mar y Mar'
        }
      }
    },
    data: {
      estado: 'prospecto'
    }
  });

  console.log(`Se actualizaron ${updated.count} empresas de Activo a prospecto.`);
  console.log('Corrección finalizada.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
