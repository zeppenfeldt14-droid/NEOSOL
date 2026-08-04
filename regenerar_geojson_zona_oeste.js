/**
 * Script: regenerar_geojson_zona_oeste.js
 * 
 * Regenera los polígonos GeoJSON de los barrios de ZONA OESTE y ZONA SUR
 * directamente en la base de datos, llamando a Nominatim barrio por barrio.
 * 
 * Uso: node regenerar_geojson_zona_oeste.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ZONAS_A_REGENERAR = ['ZONA OESTE', 'ZONA SUR', 'ZONA NORTE', 'CABA'];

async function fetchGeoJsonForBarrio(barrio) {
  const q = encodeURIComponent(`${barrio}, Buenos Aires, Argentina`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&q=${q}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'NeosolCRM/1.0' } });
    if (!res.ok) {
      console.warn(`  ⚠️  HTTP ${res.status} para: ${barrio}`);
      return null;
    }
    const data = await res.json();
    const geoItem = data.find(item => item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon'));
    if (geoItem) {
      return { type: 'Feature', properties: { name: barrio }, geometry: geoItem.geojson };
    } else {
      console.warn(`  ⚠️  Sin polígono para: ${barrio}`);
      return null;
    }
  } catch (e) {
    console.error(`  ❌ Error para: ${barrio}`, e.message);
    return null;
  }
}

async function main() {
  console.log('=== REGENERANDO GEOJSON DE ZONAS ===\n');

  for (const zonaNombre of ZONAS_A_REGENERAR) {
    const zona = await prisma.zona.findFirst({
      where: { nombre: { equals: zonaNombre, mode: 'insensitive' } }
    });

    if (!zona) {
      console.log(`⏭️  Zona no encontrada: ${zonaNombre}`);
      continue;
    }

    const barrios = (zona.barrios || []);
    if (barrios.length === 0) {
      console.log(`⏭️  Zona "${zonaNombre}" sin barrios configurados — saltando.`);
      continue;
    }

    console.log(`\n🗺️  Procesando zona: ${zonaNombre} (${barrios.length} barrios)`);
    const features = [];

    for (let i = 0; i < barrios.length; i++) {
      const barrio = barrios[i];
      process.stdout.write(`  [${i + 1}/${barrios.length}] ${barrio}... `);
      const feature = await fetchGeoJsonForBarrio(barrio);
      if (feature) {
        features.push(feature);
        process.stdout.write('✓\n');
      } else {
        process.stdout.write('–\n');
      }
      // Respectar rate limit de Nominatim
      await new Promise(r => setTimeout(r, 700));
    }

    if (features.length > 0) {
      const geojson = { type: 'FeatureCollection', features };
      await prisma.zona.update({
        where: { id: zona.id },
        data: { geojson }
      });
      console.log(`  ✅ GeoJSON actualizado: ${features.length}/${barrios.length} polígonos encontrados`);
    } else {
      console.log(`  ❌ Ningún polígono encontrado para ${zonaNombre}`);
    }
  }

  console.log('\n=== REGENERACIÓN FINALIZADA ===');
}

main()
  .catch(e => { console.error('Error fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
