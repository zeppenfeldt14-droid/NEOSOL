const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function geocode(address) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
      headers: { 'User-Agent': 'NeosolCRM-Geocoding-Script' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch(e) {
    console.error('Fetch error:', e);
  }
  return null;
}

async function main() {
  const missing = await prisma.empresa.findMany({
    where: { subZona: 'CABA 6', OR: [{ latitud: null }, { longitud: null }] }
  });
  
  console.log(`Found ${missing.length} missing coords in CABA 6`);
  for (const emp of missing) {
    if (!emp.direccion) continue;
    // Build query
    let q = emp.direccion;
    if (emp.barrio) q += `, ${emp.barrio}`;
    if (!q.includes('Buenos Aires') && !q.includes('CABA')) q += ', Buenos Aires, Argentina';
    
    console.log(`Geocoding: ${q}`);
    const coords = await geocode(q);
    if (coords) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { latitud: coords.lat, longitud: coords.lng }
      });
      console.log(`  -> SUCCESS: ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`  -> FAILED for ${emp.nombre}`);
    }
    // Respect rate limit
    await new Promise(r => setTimeout(r, 1100));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
