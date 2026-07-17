const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const empresas = await prisma.empresa.findMany({
    include: {
      visitas: true,
      acciones: true
    }
  })
  
  let oldAlertsList = [];
  let newAlertsList = [];
  
  for (const emp of empresas) {
    const ultimaVisita = emp.visitas?.[0]?.fecha
    const ultimaAccion = emp.acciones?.[0]?.creadoEn
    
    // old logic
    const oldUltimaVisita = emp.visitas?.[0]?.fecha || emp.creadoEn
    const oldDias = Math.floor((Date.now() - new Date(oldUltimaVisita).getTime()) / (1000 * 60 * 60 * 24))
    if (emp.estado === 'prospecto' && oldDias > 7) {
      oldAlertsList.push(emp.id);
      
      // Check why it's not in new logic
      const fechas = [
        ultimaVisita ? new Date(ultimaVisita).getTime() : 0,
        ultimaAccion ? new Date(ultimaAccion).getTime() : 0,
        new Date(emp.creadoEn).getTime()
      ]
      const ultimaInteraccion = new Date(Math.max(...fechas))
      const dias = Math.floor((Date.now() - ultimaInteraccion.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dias <= 7) {
        console.log(`Empresa ${emp.id}: oldDias=${oldDias}, newDias=${dias}, ultimaAccion=${ultimaAccion}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect())
