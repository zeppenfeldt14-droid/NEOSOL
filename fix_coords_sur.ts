import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const data = [
    { nombre: "Mayorista La Union", coord: "-34.8621, -58.5284" },
    { nombre: "Los Porteños srl Mayorista", coord: "-34.8812, -58.5521" },
    { nombre: "Mayorista Los Angeles", coord: "-34.8212, -58.4618" },
    { nombre: "EL REY DE LOS COMBOS - GOLOSINAS POR MAYOR", coord: "-34.8052, -58.4510" },
    { nombre: "Distribuidora RO-JO", coord: "-34.8285, -58.4712" },
    { nombre: "Distribuidora Malvinas", coord: "-34.8310, -58.4680" },
    { nombre: "Mayorista Los Chulos", coord: "-34.8510, -58.5210" },
    { nombre: "Distribuidora Del Plata", coord: "-34.8830, -58.5580" },
    { nombre: "Delisur", coord: "-34.8540, -58.3812" },
    { nombre: "Distribuidora Longchamps", coord: "-34.8580, -58.3890" },
    { nombre: "CASA GADI", coord: "-34.8520, -58.3840" },
    { nombre: "Pameli SA", coord: "-34.8320, -58.3910" },
    { nombre: "MAYORISTA Y DISTRIBUIDORA EL MOLINO", coord: "-34.8335, -58.3925" },
    { nombre: "Mayorista OLTI", coord: "-34.9120, -58.3810" },
    { nombre: "Cuesta Blanca Mayorista Para Kioscos", coord: "-34.8390, -58.3950" },
    { nombre: "DulceSur Mayorista", coord: "-34.9180, -58.3870" },
    { nombre: "Mayorista GoloCenter", coord: "-34.9810, -58.3720" },
    { nombre: "Mayorista San Vicente", coord: "-35.0210, -58.4210" },
    { nombre: "La Cuarta - MAYORISTA DE GALLETITAS", coord: "-34.9850, -58.3780" },
    { nombre: "CASA L.H.E.A.", coord: "-34.9150, -58.3840" },
    { nombre: "LA CHOLA mayorista", coord: "-34.9890, -58.3810" },
    { nombre: "MEGA DISTRIBUIDORA FERRARIS", coord: "-34.9180, -57.9620" },
    { nombre: "Mayorista Olmos", coord: "-34.9680, -58.0310" },
    { nombre: "Distribuidora San Carlos", coord: "-34.9520, -57.9950" },
    { nombre: "Carlos Fernández Golosinas", coord: "-34.9120, -57.9480" },
    { nombre: "El Galpón distribuidora", coord: "-34.9310, -57.9450" },
    { nombre: "Distribuidora Berisso srl", coord: "-34.9160, -57.9510" },
    { nombre: "Mayorista de bebidas Olmos", coord: "-34.9650, -58.0280" },
    { nombre: "La Golosinera La Plata", coord: "-34.9380, -57.9710" },
    { nombre: "Nini Mayorista - La Plata", coord: "-34.8890, -57.9850" }
  ];

  let success = 0;
  for (const item of data) {
    const parts = item.coord.split(',');
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());

    const result = await prisma.empresa.updateMany({
      where: { nombre: item.nombre },
      data: {
        latitud: lat,
        longitud: lng
      }
    });
    
    if (result.count > 0) success++;
  }

  console.log(`Updated coordinates for ${success} out of ${data.length} companies from Zona Sur.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
