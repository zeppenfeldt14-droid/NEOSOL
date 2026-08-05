import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Corrigiendo coordenadas de MAYORISTA LA NORIA...');

  const updated = await prisma.empresa.updateMany({
    where: {
      nombre: {
        contains: 'MAYORISTA LA NORIA',
        mode: 'insensitive'
      }
    },
    data: {
      latitud: -34.7090001,
      longitud: -58.4584173,
      direccion: 'Cosquín 2626, C1814 La Noria, Cdad. Autónoma de Buenos Aires',
      zona: 'ZONA SUR'
    }
  });

  console.log(`Empresa actualizada: ${updated.count}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
