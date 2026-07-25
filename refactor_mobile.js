const fs = require('fs');
let content = fs.readFileSync('src/app/pedidos/nuevo/NuevoPedidoClient.tsx', 'utf-8');

// 1. Modify handleGuardar
content = content.replace('if (pctA > 0) {', 'if (pctA > 0 && enviarAlSupervisor) {');

// 2. Extract renderNegociacionBlock
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('{/* Negociaci'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('          </div>') && lines[i+1].includes('        </div>') && lines[i+2].includes('      </div>'));

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find Negociacion block limits. Start:', startIdx, 'End:', endIdx);
    process.exit(1);
}

const blockLines = lines.slice(startIdx, endIdx + 1);

const returnIdx = lines.findIndex((l, i) => l.includes('  return (') && lines[i+1].includes('    <div className=\"flex flex-col gap-6 pb-12\">'));

if (returnIdx === -1) {
    console.error('Could not find return statement');
    process.exit(1);
}

let newLines = [
  ...lines.slice(0, returnIdx),
  '  const renderNegociacionBlock = () => (',
  ...blockLines,
  '  )',
  '',
  ...lines.slice(returnIdx, startIdx),
  '          {renderNegociacionBlock()}',
  ...lines.slice(endIdx + 1)
];

// 3. Update Mobile Fixed Bottom Bar
const mobileBottomIdx = newLines.findIndex(l => l.includes('{/* Mobile Fixed Bottom Bar */}'));
if (mobileBottomIdx !== -1) {
  // Inject {renderNegociacionBlock()} before it
  newLines.splice(mobileBottomIdx, 0, '        <div className=\"md:hidden mt-4 mb-20\">{renderNegociacionBlock()}</div>');
  
  // Modify Saldo Aprox
  const saldoIdx = newLines.findIndex((l, i) => i > mobileBottomIdx && l.includes('Saldo Aprox.'));
  if (saldoIdx !== -1) {
    newLines[saldoIdx] = newLines[saldoIdx].replace('Saldo Aprox.', 'TOTAL CAJAS: {totalCajas} | Saldo Aprox.');
  }
}

fs.writeFileSync('src/app/pedidos/nuevo/NuevoPedidoClient.tsx', newLines.join('\n'));
console.log('Script executed successfully.');
