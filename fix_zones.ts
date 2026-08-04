import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Recalculando zonas para todas las empresas...")
  const empresas = await prisma.empresa.findMany()
  let updated = 0;

  for (const emp of empresas) {
    let zona = emp.zona || 'POR ASIGNAR';
    const locationText = `${emp.barrio || ''} ${emp.partido || ''}`.toUpperCase();

    let nuevaZona = 'POR ASIGNAR';
    
    if (/CABA|COMUNA|PALERMO|BALVANERA|BELGRANO|CABALLITO|RECOLETA|MATADEROS|LINIERS|POMPEYA|FLORES|CONSTITUCI(Ó|O)N|VILLA CRESPO/i.test(locationText) || locationText.includes('CABA')) {
      nuevaZona = 'CABA';
    } else if (/MOR(Ó|O)N|RAMOS MEJ(Í|I)A|CASTELAR|ITUZAING(Ó|O)|SAN JUSTO|MERLO|MORENO|CASANOVA|TABLADA|TESEI|PASO DEL REY/i.test(locationText)) {
      nuevaZona = 'ZONA OESTE';
    } else if (/QUILMES|AVELLANEDA|LAN(Ú|U)S|SARAND(Í|I)|BERNAL|DOM(Í|I)NICO|CHINGOLO|GERLI/i.test(locationText)) {
      nuevaZona = 'ZONA SUR';
    } else if (/SAN ISIDRO|VICENTE L(Ó|O)PEZ|MUNRO|SAN FERNANDO|PACHECO|TIGRE/i.test(locationText)) {
      nuevaZona = 'ZONA NORTE';
    }

    // Solo actualizamos si encontramos una zona válida distinta a la actual,
    // o si estaba erróneamente en ZONA OESTE sin pertenecer allí.
    if (nuevaZona !== 'POR ASIGNAR' && emp.zona !== nuevaZona) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { zona: nuevaZona }
      })
      updated++;
    } else if (nuevaZona === 'POR ASIGNAR' && emp.zona === 'ZONA OESTE' && locationText.trim() !== '') {
        // Si estaba en Zona Oeste por error y no se encontró otra regla, la dejamos por asignar para revisión
        await prisma.empresa.update({
            where: { id: emp.id },
            data: { zona: 'POR ASIGNAR' }
        })
        updated++;
    }
  }
  
  console.log(`Proceso finalizado. Empresas re-clasificadas: ${updated}`)
  
  const distribucion = await prisma.empresa.groupBy({
    by: ['zona'],
    _count: { zona: true }
  });
  console.log("Nueva distribución:", distribucion);
}

main().catch(console.error).finally(() => prisma.$disconnect())
