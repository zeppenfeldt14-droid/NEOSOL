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
  console.log("Leyendo data_full.csv...")
  const csvText = fs.readFileSync('data_full.csv', 'utf-8')
  
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true
  })
  
  console.log(`Se encontraron ${records.length} empresas en el CSV.`)
  
  let added = 0;
  let updated = 0;

  for (const row of records as any[]) {
    if (!row.name || row.name.trim() === '') continue
    
    // Clean Barrio logic
    let rawBarrio = (row.county && row.county.trim() !== '') ? row.county : (row.city ? row.city : '');
    let barrio = rawBarrio.trim();
    if (row.postal_code) {
      barrio = barrio.replace(row.postal_code, '').trim();
    }
    // Remove standalone 3-4 uppercase letters like AAX, DNO which sometimes show up
    barrio = barrio.replace(/\b[A-Z]{3,4}\b/g, '').trim();
    // Remove leading commas if any
    barrio = barrio.replace(/^,/, '').trim();
    
    // Auto-detect zone using dictionary on location fields ONLY
    let zona = 'POR ASIGNAR';
    const locationText = `${row.city || ''} ${row.county || ''} ${row.state || ''} ${row.state_code || ''} ${barrio}`.toUpperCase();
    
    if (/CABA|COMUNA|PALERMO|BALVANERA|BELGRANO|CABALLITO|RECOLETA|MATADEROS|LINIERS|POMPEYA|FLORES|CONSTITUCI(Ó|O)N|VILLA CRESPO|PARQUE CHACABUCO|SAN CRIST(Ó|O)BAL|SAN TELMO|MONSERRAT|PARQUE PATRICIOS|BOCA|BARRACAS/i.test(locationText) || locationText.includes('CABA')) {
      zona = 'CABA';
    } else if (/MOR(Ó|O)N|RAMOS MEJ(Í|I)A|CASTELAR|ITUZAING(Ó|O)|SAN JUSTO|MERLO|MORENO|CASANOVA|TABLADA|TESEI|PASO DEL REY|HAEDO|HURLINGHAM/i.test(locationText)) {
      zona = 'ZONA OESTE';
    } else if (/QUILMES|AVELLANEDA|LAN(Ú|U)S|SARAND(Í|I)|BERNAL|DOM(Í|I)NICO|CHINGOLO|GERLI|LOMAS DE ZAMORA|BANFIELD|TEMPERLEY|FLORENCIO VARELA|BERAZATEGUI/i.test(locationText)) {
      zona = 'ZONA SUR';
    } else if (/SAN ISIDRO|VICENTE L(Ó|O)PEZ|MUNRO|SAN FERNANDO|PACHECO|TIGRE|OLIVOS|FLORIDA OESTE|VILLA MARTELLI/i.test(locationText)) {
      zona = 'ZONA NORTE';
    }

    const nombre = row.name.trim();
    const direccion = row.street ? row.street.trim() : (row.address ? row.address.trim() : '');
    
    const lat = cleanCoordinate(row.latitude);
    const lng = cleanCoordinate(row.longitude);

    let emp = await prisma.empresa.findFirst({
      where: { nombre: nombre }
    })
    
    if (emp) {
      // RESTRICCIÓN CRÍTICA: SOLO actualizar coordenadas, zona, barrio, y dirección
      // No tocar nada más (acciones, vendedor, estado, etc.)
      await prisma.empresa.update({
        where: { id: emp.id },
        data: {
          direccion: direccion,
          barrio: barrio,
          latitud: lat,
          longitud: lng,
          zona: zona
        }
      })
      updated++;
    } else {
      // Si no existe, la creamos
      const telefono = row.phone ? row.phone.trim() : '';
      const url = row.website ? row.website.trim() : '';
      const googleMaps = row.location_link ? row.location_link.trim() : '';

      await prisma.empresa.create({
        data: {
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
      })
      added++;
    }
  }
  
  console.log(`Importación finalizada con éxito.`)
  console.log(`Empresas Creadas: ${added}`)
  console.log(`Empresas Actualizadas (coordenadas, dirección, barrio, y zona): ${updated}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
