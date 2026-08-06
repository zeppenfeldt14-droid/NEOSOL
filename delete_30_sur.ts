import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const nombres = [
    "Mayorista La Union",
    "Los Porteños srl Mayorista",
    "Mayorista Los Angeles",
    "EL REY DE LOS COMBOS - GOLOSINAS POR MAYOR",
    "Distribuidora RO-JO",
    "Distribuidora Malvinas",
    "Mayorista Los Chulos",
    "Distribuidora Del Plata",
    "Delisur",
    "Distribuidora Longchamps",
    "CASA GADI",
    "Pameli SA",
    "MAYORISTA Y DISTRIBUIDORA EL MOLINO",
    "Mayorista OLTI",
    "Cuesta Blanca Mayorista Para Kioscos",
    "DulceSur Mayorista",
    "Mayorista GoloCenter",
    "Mayorista San Vicente",
    "La Cuarta - MAYORISTA DE GALLETITAS",
    "CASA L.H.E.A.",
    "LA CHOLA mayorista",
    "MEGA DISTRIBUIDORA FERRARIS",
    "Mayorista Olmos",
    "Distribuidora San Carlos",
    "Carlos Fernández Golosinas",
    "El Galpón distribuidora",
    "Distribuidora Berisso srl",
    "Mayorista de bebidas Olmos",
    "La Golosinera La Plata",
    "Nini Mayorista - La Plata"
  ];

  const result = await prisma.empresa.deleteMany({
    where: {
      nombre: {
        in: nombres
      }
    }
  });

  console.log(`Borradas ${result.count} empresas de Zona Sur de forma quirúrgica.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
