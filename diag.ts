import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvText = fs.readFileSync('data_full.csv', 'utf-8');
const records = parse(csvText, { columns: true, skip_empty_lines: true });

let caba = 0;
let sur = 0;
let oeste = 0;
let norte = 0;

console.log("Analyzing...");

for (const row of records) {
    let rawBarrio = (row.county && row.county.trim() !== '') ? row.county : (row.city ? row.city : '');
    let barrio = rawBarrio.trim();
    if (row.postal_code) barrio = barrio.replace(row.postal_code, '').trim();
    barrio = barrio.replace(/\b[A-Z]{3,4}\b/g, '').trim();
    barrio = barrio.replace(/^,/, '').trim();
    
    const locationText = `${row.city || ''} ${row.county || ''} ${row.state || ''} ${row.state_code || ''} ${barrio}`.toUpperCase();
    
    if (/CABA|COMUNA|PALERMO|BALVANERA|BELGRANO|CABALLITO|RECOLETA|MATADEROS|LINIERS|POMPEYA|FLORES|CONSTITUCI(Ó|O)N|VILLA CRESPO|PARQUE CHACABUCO|SAN CRIST(Ó|O)BAL|SAN TELMO|MONSERRAT|PARQUE PATRICIOS|BOCA|BARRACAS/i.test(locationText) || locationText.includes('CABA')) {
      caba++;
      if (caba < 5) console.log("Matched CABA:", locationText, row.name);
    } else if (/MOR(Ó|O)N|RAMOS MEJ(Í|I)A|CASTELAR|ITUZAING(Ó|O)|SAN JUSTO|MERLO|MORENO|CASANOVA|TABLADA|TESEI|PASO DEL REY|HAEDO|HURLINGHAM/i.test(locationText)) {
      oeste++;
    } else if (/QUILMES|AVELLANEDA|LAN(Ú|U)S|SARAND(Í|I)|BERNAL|DOM(Í|I)NICO|CHINGOLO|GERLI|LOMAS DE ZAMORA|BANFIELD|TEMPERLEY|FLORENCIO VARELA|BERAZATEGUI/i.test(locationText)) {
      sur++;
    } else if (/SAN ISIDRO|VICENTE L(Ó|O)PEZ|MUNRO|SAN FERNANDO|PACHECO|TIGRE|OLIVOS|FLORIDA OESTE|VILLA MARTELLI/i.test(locationText)) {
      norte++;
    }
}
console.log('Totals -> CABA:', caba, 'OESTE:', oeste, 'SUR:', sur, 'NORTE:', norte);
