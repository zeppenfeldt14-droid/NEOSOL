const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany({where: {zona: 'ZONA OESTE'}});
  const reportes = await prisma.reporteVisitas.findMany({where: {zona: 'CABA'}});
  
  for (const emp of empresas) {
    let matchStr = emp.nombre.toLowerCase().trim();
    if (matchStr.includes('-')) {
        matchStr = matchStr.split('-')[0].trim();
    }
    
    for (const rep of reportes) {
      try {
        const data = JSON.parse(rep.datosJSON);
        if (data.visitas) {
          for (const v of data.visitas) {
            if (v.empresaNombre && v.empresaNombre.toLowerCase().includes(matchStr)) {
              const texto = `[${v.resultado}] Contacto: ${v.contacto || 'N/A'}\nNotas: ${v.notas || 'N/A'}\nPróxima acción: ${v.proximaAccion || 'N/A'}`;
              await prisma.notaPlanificador.create({
                  data: {
                      texto, 
                      empresaId: emp.id, 
                      zona: 'ZONA OESTE', 
                      creadoPor: rep.vendedorAlias, 
                      estado: 'completado'
                  }
              });
              console.log('Historial restaurado para', emp.nombre, 'desde reporte', rep.fecha);
            }
          }
        }
      } catch(e) {}
    }
  }
}

main().finally(() => prisma.$disconnect());
