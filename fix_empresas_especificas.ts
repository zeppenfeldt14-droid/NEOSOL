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

  const updateResult = await prisma.empresa.updateMany({
    where: {
      nombre: {
        in: nombres
      }
    },
    data: {
      vendedorAsignado: "Ddilerna",
      zona: "SUR" // Assigning zona to SUR just in case it wasn't ZONA SUR
    }
  });

  console.log(`Se actualizaron ${updateResult.count} empresas.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
