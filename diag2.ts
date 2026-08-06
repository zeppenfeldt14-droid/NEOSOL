import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvText = fs.readFileSync('data_full.csv', 'utf-8');
const records = parse(csvText, { columns: true, skip_empty_lines: true });

let caba = 0;
for (const row of records) {
    let rawBarrio = (row.county && row.county.trim() !== '') ? row.county : (row.city ? row.city : '');
    let barrio = rawBarrio.trim();
    if (row.postal_code) barrio = barrio.replace(row.postal_code, '').trim();
    barrio = barrio.replace(/\b[A-Z]{3,4}\b/g, '').trim();
    barrio = barrio.replace(/^,/, '').trim();
    
    const locationText = `${row.city || ''} ${row.county || ''} ${row.state || ''} ${row.state_code || ''} ${barrio}`.toUpperCase();
    
    if (/CABA|COMUNA|PALERMO|BALVANERA|BELGRANO|CABALLITO|RECOLETA|MATADEROS|LINIERS|POMPEYA|FLORES|CONSTITUCI(Ó|O)N|VILLA CRESPO|PARQUE CHACABUCO|SAN CRIST(Ó|O)BAL|SAN TELMO|MONSERRAT|PARQUE PATRICIOS|BOCA|BARRACAS/i.test(locationText) || locationText.includes('CABA')) {
      caba++;
      if (caba < 15) {
          console.log("-> MATCH CABA:", locationText, " | NAME:", row.name);
      }
    }
}
console.log("Total CABA:", caba);
