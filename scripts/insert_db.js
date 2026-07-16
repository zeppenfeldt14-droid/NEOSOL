const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const textsPath = path.join(process.cwd(), 'scratch', 'all_texts.json');
  if (!fs.existsSync(textsPath)) {
    console.error('No se encontró all_texts.json');
    return;
  }
  
  const allTexts = JSON.parse(fs.readFileSync(textsPath, 'utf8'));
  
  for (const item of allTexts) {
    let fecha = item.date; // Viene como "2026-06-05T12:00:00Z"
    
    // Transformar a DD-MM-YYYY
    const d = new Date(fecha);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    fecha = `${day}-${month}-${year}`;

    const datosJSON = {
      fecha: fecha,
      vendedorAlias: 'Ernesto Lares',
      zona: 'Histórico',
      visitas: [
        {
          id: 1,
          empresaNombre: `Reporte Histórico (${item.filename})`,
          resultado: 'visita_realizada',
          barrio: '-',
          direccion: '-',
          contacto: '-',
          notas: item.text || 'Sin texto extraído.'
        }
      ],
      pendientes: []
    };

    try {
      await prisma.reporteVisitas.upsert({
        where: {
          fecha_zona: {
            fecha: fecha,
            zona: 'Histórico'
          }
        },
        update: {
          datosJSON: JSON.stringify(datosJSON)
        },
        create: {
          fecha: fecha,
          zona: 'Histórico',
          vendedorAlias: 'Ernesto Lares',
          datosJSON: JSON.stringify(datosJSON)
        }
      });
      console.log(`✅ Reporte insertado/actualizado para ${fecha}`);
    } catch (err) {
      console.error(`❌ Error insertando ${fecha}:`, err.message);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
