import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import pdfParse = require('pdf-parse');

const prisma = new PrismaClient();
const directories = [
  path.join(process.cwd(), 'scratch', 'drive_folder_1'),
  path.join(process.cwd(), 'scratch', 'drive_folder_2', 'Reportes Junio'),
  path.join(process.cwd(), 'scratch', 'drive_folder_2')
];

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{1,2})[-_]?(\d{1,2})[-_]?(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${day}-${month}-${year}`; // DD-MM-YYYY format
  }
  return null;
}

async function processDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.pdf')) continue;
    
    const filePath = path.join(dirPath, file);
    // Para evitar procesar si es un directorio (por si acaso)
    if (fs.statSync(filePath).isDirectory()) continue;

    console.log(`Procesando archivo: ${file}`);
    
    const fecha = extractDateFromFilename(file);
    if (!fecha) {
      console.warn(`No se pudo extraer la fecha del archivo: ${file}`);
      continue;
    }
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text.trim();
      
      // Creamos una estructura compatible con ReportGenerator.tsx
      const datosJSON = {
        fecha: fecha,
        vendedorAlias: 'Histórico',
        zona: 'No especificada',
        visitas: [
          {
            id: 1,
            empresaNombre: `Reporte Original (Histórico)`,
            resultado: 'visita_realizada',
            barrio: '-',
            direccion: '-',
            contacto: '-',
            notas: text || 'Sin contenido legible en el PDF.'
          }
        ],
        pendientes: []
      };

      // Guardamos en la base de datos usando upsert para evitar duplicados
      await prisma.reporteVisitas.upsert({
        where: {
          fecha_zona: {
            fecha: fecha,
            zona: 'No especificada'
          }
        },
        update: {
          datosJSON: JSON.stringify(datosJSON)
        },
        create: {
          fecha: fecha,
          zona: 'No especificada',
          vendedorAlias: 'Histórico',
          datosJSON: JSON.stringify(datosJSON)
        }
      });
      
      console.log(`✅ Reporte guardado para la fecha ${fecha}`);
      
    } catch (error) {
      console.error(`❌ Error procesando el archivo ${file}:`, error);
    }
  }
}

async function main() {
  console.log('Iniciando importación de PDFs...');
  for (const dir of directories) {
    console.log(`Explorando directorio: ${dir}`);
    await processDirectory(dir);
  }
  console.log('Importación finalizada.');
}

main()
  .catch((e) => {
    console.error('Error general:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
