import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const reportes = await prisma.reporteVisitas.findMany({
    where: { zona: 'Histórico' }
  })

  for (const rep of reportes) {
    let datos = JSON.parse(rep.datosJSON)
    const notasStr = datos.visitas[0]?.notas || ''

    // Separamos por "Resultado:" o "Resultado :"
    const bloques = notasStr.split(/Resultado\s*:/i)
    
    if (bloques.length <= 1) {
      console.log(`Reporte ${rep.id} no tiene 'Resultado:'. Se deja igual.`)
      continue
    }

    const introText = bloques[0].split('Detalle de mi Recorrido')[0].trim()
    const resultVisitas = []

    for (let i = 0; i < bloques.length - 1; i++) {
      // bloques[i] tiene la info de la empresa al final.
      // bloques[i+1] tiene el resultado de la empresa al principio.
      
      let bloqueEmpresa = bloques[i].split('Detalle de mi Recorrido').pop() || bloques[i]
      let lineasEmpresa = bloqueEmpresa.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      
      // La estructura suele ser:
      // [Otras cosas]
      // Nombre Empresa
      // Estado (Prospecto, etc)
      // Dirección | Tel
      
      // Tomamos las últimas 3 líneas
      let dirInfo = lineasEmpresa.pop() || '-'
      let estadoInfo = lineasEmpresa.pop() || '-'
      let nombreEmpresa = lineasEmpresa.pop() || 'Empresa Desconocida'

      // El resultado de esta empresa está al principio del siguiente bloque (antes de la próxima empresa)
      // Básicamente, tomamos el texto hasta la penúltima línea del siguiente bloque (porque las últimas 3 serán de la prox empresa)
      let resultadoTexto = ''
      if (i === bloques.length - 2) {
        // Es el último resultado, tomamos todo
        resultadoTexto = bloques[i+1].trim()
      } else {
        let lineasSiguiente = bloques[i+1].split('\n').map(l => l.trim()).filter(l => l.length > 0)
        // Quitamos las últimas 3 líneas que pertenecen a la siguiente empresa
        let proxEmpresaLines = lineasSiguiente.splice(-3)
        resultadoTexto = lineasSiguiente.join(' ')
      }

      // Limpiamos un poco el resultado si quedó algo raro
      let estadoMapped = 'visita_realizada'
      if (estadoInfo.toLowerCase().includes('descarte')) estadoMapped = 'rechazado'
      if (estadoInfo.toLowerCase().includes('venta') || estadoInfo.toLowerCase().includes('caja')) estadoMapped = 'venta_cerrada'

      resultVisitas.push({
        id: i + 1,
        empresaNombre: nombreEmpresa.substring(0, 50),
        resultado: estadoMapped,
        barrio: dirInfo.substring(0, 50),
        direccion: dirInfo,
        contacto: estadoInfo,
        notas: resultadoTexto
      })
    }

    datos.visitas = resultVisitas
    datos.pendientes = [
      { id: 999, texto: "Revisión Histórica: " + introText.substring(0, 100), completada: false }
    ]

    await prisma.reporteVisitas.update({
      where: { id: rep.id },
      data: { datosJSON: JSON.stringify(datos) }
    })
    console.log(`✅ Reporte ${rep.id} parseado y actualizado (${resultVisitas.length} visitas encontradas).`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
