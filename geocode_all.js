const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanAddress(addr) {
  let cleaned = addr;
  const dict = {
    'av.': 'Avenida',
    'av ': 'Avenida ',
    'gral.': 'General',
    'gral ': 'General ',
    'cap.': 'Capitán',
    'cap ': 'Capitán ',
    'pte.': 'Presidente',
    'pte ': 'Presidente ',
    'diag.': 'Diagonal',
    'rbla.': 'Rambla',
    'cdad.': 'Ciudad',
    'cdad': 'Ciudad',
    'pcia.': 'Provincia',
    'pcia': 'Provincia',
    'b°': 'Barrio',
    'contitucion': 'Constitucion',
    'esmaralda': 'Esmeralda',
    'piso': '',
    'depto': '',
    'pb': ''
  };

  for (const [key, value] of Object.entries(dict)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}`, 'gi');
    cleaned = cleaned.replace(regex, value);
  }
  
  return cleaned.trim();
}

function extractLocality(addr) {
  const parts = addr.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return parts[1];
  }
  return null;
}

async function fetchGeo(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&countrycodes=ar`, {
      headers: { 'User-Agent': 'NeosolCRM-Massive-Geocoder/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch(e) {
    console.error('Fetch error for', query, e.message);
  }
  return null;
}

async function main() {
  const missing = await prisma.empresa.findMany({
    where: { OR: [{ latitud: null }, { longitud: null }] }
  });
  
  console.log(`Found ${missing.length} companies missing coords total`);
  let successCount = 0;

  const ZONA_A_LOCALIDAD = {
    'GBA NORTE':  'Gran Buenos Aires Norte',
    'GBA SUR':    'Gran Buenos Aires Sur',
    'GBA OESTE':  'Morón, Buenos Aires',
    'GBA ESTE':   'Quilmes, Buenos Aires',
    'CABA':       'Ciudad Autónoma de Buenos Aires',
    'ZONA NORTE': 'Gran Buenos Aires Norte',
    'ZONA SUR':   'Gran Buenos Aires Sur',
    'ZONA OESTE': 'Morón, Buenos Aires',
    'ZONA ESTE':  'Quilmes, Buenos Aires',
  };

  for (const emp of missing) {
    if (!emp.direccion) continue;
    
    const originalAddress = emp.direccion;
    let cleanedAddress = cleanAddress(originalAddress);
    // Clean up messy formats like "Arribeños 2263/2163" -> "Arribeños 2263"
    cleanedAddress = cleanedAddress.replace(/(\d+)\/\d+/, '$1');

    const cleanBarrio = emp.barrio ? emp.barrio.replace(/^[A-Z]?\d{4,5}\s+/i, '').trim() : null;
    const locality = cleanBarrio || emp.partido || extractLocality(originalAddress) || ZONA_A_LOCALIDAD[emp.zona || ''] || 'Buenos Aires';
    
    const exactQuery = `${cleanedAddress}, ${locality}, Argentina`;
    
    let fallbackQuery1 = '';
    let streetNameOnly = '';
    let streetNameWithNumber = '';
    
    if (cleanedAddress.includes(',')) {
       const parts = cleanedAddress.split(',');
       streetNameWithNumber = parts[0].trim();
       streetNameOnly = parts[0].replace(/\d+/g, '').trim();
       fallbackQuery1 = `${streetNameWithNumber}, ${locality}, Argentina`;
    } else {
       streetNameWithNumber = cleanedAddress.trim();
       streetNameOnly = cleanedAddress.replace(/\d+/g, '').trim();
       fallbackQuery1 = `${streetNameWithNumber}, ${locality}, Argentina`;
    }

    const fallbackQuery2 = `${streetNameOnly}, ${locality}, Argentina`;
    const fallbackQuery3 = `${locality}, Argentina`;

    console.log(`\nGeocoding: ${emp.nombre} -> ${exactQuery}`);
    
    let coords = await fetchGeo(exactQuery);
    await new Promise(r => setTimeout(r, 1100));

    if (!coords && fallbackQuery1 && fallbackQuery1 !== exactQuery) {
      console.log(`  -> Fallback 1: ${fallbackQuery1}`);
      coords = await fetchGeo(fallbackQuery1);
      await new Promise(r => setTimeout(r, 1100));
    }

    if (!coords && fallbackQuery2 && fallbackQuery2 !== fallbackQuery1) {
      console.log(`  -> Fallback 2: ${fallbackQuery2}`);
      coords = await fetchGeo(fallbackQuery2);
      await new Promise(r => setTimeout(r, 1100));
    }

    if (!coords && fallbackQuery3) {
      console.log(`  -> Fallback 3: ${fallbackQuery3}`);
      coords = await fetchGeo(fallbackQuery3);
      await new Promise(r => setTimeout(r, 1100));
      if (coords) {
        coords.lat += (Math.random() - 0.5) * 0.01;
        coords.lon += (Math.random() - 0.5) * 0.01;
      }
    }

    if (coords) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { latitud: coords.lat, longitud: coords.lon }
      });
      console.log(`  -> SUCCESS`);
      successCount++;
    } else {
      console.log(`  -> FAILED completely`);
    }
  }
  console.log(`\nFinished! Successfully geocoded ${successCount} out of ${missing.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
