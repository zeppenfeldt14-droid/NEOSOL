import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

function cleanCoordinate(coordStr: string): number | null {
  if (!coordStr) return null;
  const num = parseFloat(coordStr.replace(',', '.'));
  if (isNaN(num)) return null;
  return num;
}

async function main() {
  console.log("Reading data_new.csv...")
  const csvText = fs.readFileSync('data_new.csv', 'utf-8')
  
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true
  })
  
  console.log(`Found ${records.length} companies in CSV.`)
  
  let added = 0;
  let updated = 0;

  for (const row of records as any[]) {
    if (!row.name || row.name.trim() === '') continue
    
    // Parse Zona from Query if possible
    let zona = 'ZONA NO DEFINIDA';
    if (row.query && row.query.toUpperCase().includes('ZONA OESTE')) zona = 'ZONA OESTE';
    else if (row.query && row.query.toUpperCase().includes('ZONA SUR')) zona = 'ZONA SUR';
    else if (row.query && row.query.toUpperCase().includes('ZONA NORTE')) zona = 'ZONA NORTE';
    else if (row.query && row.query.toUpperCase().includes('CABA')) zona = 'CABA';

    const nombre = row.name.trim();
    const direccion = row.street ? row.street.trim() : (row.address ? row.address.trim() : '');
    
    // Clean City/Barrio to remove postal code just in case
    let barrio = row.city ? row.city.trim() : '';
    barrio = barrio.replace(/^[A-Z]?\d{4,5}\s+/i, '').trim(); 

    const telefono = row.phone ? row.phone.trim() : '';
    const url = row.website ? row.website.trim() : '';
    const googleMaps = row.location_link ? row.location_link.trim() : '';

    const lat = cleanCoordinate(row.latitude);
    const lng = cleanCoordinate(row.longitude);

    let emp = await prisma.empresa.findFirst({
      where: { nombre: nombre }
    })
    
    const data = {
      nombre: nombre,
      direccion: direccion,
      barrio: barrio,
      telefono: telefono,
      url: url,
      googleMaps: googleMaps,
      zona: zona,
      estado: 'Activo',
      latitud: lat,
      longitud: lng
    }
    
    if (emp) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: data
      })
      updated++;
    } else {
      await prisma.empresa.create({
        data: data
      })
      added++;
    }
  }
  
  console.log(`Importación finalizada con éxito.`)
  console.log(`Empresas Creadas: ${added}`)
  console.log(`Empresas Actualizadas (con coordenadas exactas): ${updated}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
