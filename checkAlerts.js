const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const empresas = await prisma.empresa.findMany({
    include: {
      visitas: true,
      acciones: true
    }
  })
  
  let countAlerts = 0;
  for (const emp of empresas) {
    const ultimaVisita = emp.visitas?.[0]?.fecha
    const ultimaAccion = emp.acciones?.[0]?.creadoEn
    const fechas = [
      ultimaVisita ? new Date(ultimaVisita).getTime() : 0,
      ultimaAccion ? new Date(ultimaAccion).getTime() : 0,
      new Date(emp.creadoEn).getTime()
    ]
    const ultimaInteraccion = new Date(Math.max(...fechas))
    const dias = Math.floor((Date.now() - ultimaInteraccion.getTime()) / (1000 * 60 * 60 * 24))
    
    if (emp.estado === 'prospecto' && dias > 7) {
      countAlerts++
      console.log(`Alert for ${emp.id}: dias=${dias}`)
    }
  }
  
  console.log('Total prospectos:', empresas.filter(e => e.estado === 'prospecto').length)
  console.log('Total alerts that would be generated:', countAlerts)
  
  // also check old logic
  let oldAlerts = 0;
  for (const emp of empresas) {
    const ultimaVisita = emp.visitas?.[0]?.fecha || emp.creadoEn
    const dias = Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24))
    if (emp.estado === 'prospecto' && dias > 7) {
      oldAlerts++
    }
  }
  console.log('Old logic alerts:', oldAlerts)
}

main().finally(() => prisma.$disconnect())
