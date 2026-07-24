const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const empresas = await prisma.empresa.findMany({
    where: {
      subZona: 'CABA 6'
    }
  })
  
  console.log(`Found ${empresas.length} companies in CABA 6`);
  for (const e of empresas) {
    if (!e.latitud || !e.longitud) {
       console.log(`Missing Coords - Empresa: ${e.nombre}, Dir: ${e.direccion}, Barrio: ${e.barrio}, Partido: ${e.partido}`);
    } else if (e.latitud > -34 || e.latitud < -35) { // Roughly check if they are outside normal BA bounds
       console.log(`Weird Coords - Empresa: ${e.nombre}, Dir: ${e.direccion}, Lat: ${e.latitud}, Lng: ${e.longitud}`);
    } else {
       // Check if they are far away (outside general paz)
       console.log(`OK Coords - Empresa: ${e.nombre}, Dir: ${e.direccion}, Lat: ${e.latitud}, Lng: ${e.longitud}`);
    }
  }

}

main().catch(console.error).finally(() => prisma.$disconnect())
