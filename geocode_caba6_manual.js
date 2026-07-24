const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const manualCoords = {
  "Distribuidora Los Amigos": { lat: -34.5510, lng: -58.5085 },
  "Supermercado Casa China": { lat: -34.5562, lng: -58.4514 },
  "San Francisco - Fiambreria": { lat: -34.6480, lng: -58.6210 },
  "Distribuidora Pop": { lat: -34.5360, lng: -58.5130 },
  "Fantoche": { lat: -34.6645, lng: -58.4635 },
  "Mayorista Makro": { lat: -34.5710, lng: -58.5065 }
};

async function main() {
  for (const [nombre, coords] of Object.entries(manualCoords)) {
    const res = await prisma.empresa.updateMany({
      where: { nombre },
      data: { latitud: coords.lat, longitud: coords.lng }
    });
    console.log(`Updated ${nombre}: ${res.count} rows`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
