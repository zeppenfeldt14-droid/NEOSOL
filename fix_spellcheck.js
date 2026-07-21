const fs = require('fs');
const path = require('path');

const files = [
  'src/app/mensajes/BandejaMensajesClient.tsx',
  'src/app/pedidos/nuevo/NuevoPedidoClient.tsx',
  'src/app/visitas-hoy/[zonaName]/VisitasHoyClient.tsx',
  'src/app/visitas-hoy-caba/VisitasHoyCabaClient.tsx',
  'src/app/zonas/[zonaName]/empresas/nueva/page.tsx',
  'src/app/zonas/[zonaName]/empresas/[id]/NuevaAccionForm.tsx',
  'src/app/zonas/[zonaName]/empresas/[id]/page.tsx',
  'src/app/zonas/[zonaName]/empresas/[id]/editar/page.tsx',
  'src/app/zonas/[zonaName]/planificador/PlannerNotes.tsx'
];

for (const file of files) {
  const filePath = path.join('D:\\Reporte de Visitas\\crm-visitas', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // First, standardize to avoid double lang tags
    content = content.replace(/spellCheck=\{true\}\s*lang="es"/g, 'spellCheck="true" lang="es-AR" autoCorrect="on"');
    content = content.replace(/spellCheck=\{true\}/g, 'spellCheck="true" lang="es-AR" autoCorrect="on"');
    // Just in case there was a trailing lang="es" left over
    content = content.replace(/lang="es-AR" autoCorrect="on"\s*lang="es"/g, 'lang="es-AR" autoCorrect="on"');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
