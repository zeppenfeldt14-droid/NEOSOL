const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function geocode(address) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
      headers: { 'User-Agent': 'NeosolCRM-Massive-Geocoder' }
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
    where: { OR: [{ latitud: null }, { longitud: null }] }
  });
  
  console.log(`Found ${missing.length} companies missing coords total`);
  let successCount = 0;
  for (const emp of missing) {
    if (!emp.direccion) continue;
    
    let q = emp.direccion;
    if (emp.barrio) q += `, ${emp.barrio}`;
    if (!q.includes('Buenos Aires') && !q.includes('CABA')) {
      q += emp.zona === 'CABA' ? ', CABA, Argentina' : ', Buenos Aires, Argentina';
    }
    
    // Clean up messy formats like "Arribeños 2263/2163" -> "Arribeños 2263"
    q = q.replace(/(\d+)\/\d+/, '$1');
    
    console.log(`Geocoding: ${q}`);
    const coords = await geocode(q);
    if (coords) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { latitud: coords.lat, longitud: coords.lng }
      });
      console.log(`  -> SUCCESS: ${emp.nombre}`);
      successCount++;
    } else {
      console.log(`  -> FAILED for ${emp.nombre}`);
    }
    // Respect rate limit
    await new Promise(r => setTimeout(r, 1100));
  }
  console.log(`Finished! Successfully geocoded ${successCount} out of ${missing.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
