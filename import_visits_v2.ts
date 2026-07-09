import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

// Funciones para normalizar
function getSearchTokens(nombre: string) {
  // Ej: "Distribuidora Mar y Mar Golosinas" -> "Distribuidora Mar y Mar"
  // Ej: "Open 25" -> "Open 25"
  const tokens = nombre.split(' ')
  if (tokens.length >= 3) {
    if (tokens[0].toLowerCase() === 'distribuidora' || tokens[0].toLowerCase() === 'supermercado') {
      return tokens.slice(0, 4).join(' ')
    }
    return tokens.slice(0, 3).join(' ')
  }
  return nombre
}

async function main() {
  console.log("Limpiando historial anterior...")
  await prisma.visita.deleteMany({})
  await prisma.accion.deleteMany({
    where: { 
      tipo: 'visita_programada',
      estado: 'completada'
    }
  })

  console.log("Leyendo textos de PDFs...")
  const pdfTexts = JSON.parse(fs.readFileSync('pdf_texts.json', 'utf8'))

  const empresas = await prisma.empresa.findMany()
  // Sort companies by name length descending so we match longest names first
  empresas.sort((a, b) => b.nombre.length - a.nombre.length)

  let totalVisitas = 0

  for (const pdf of pdfTexts) {
    const text = pdf.text as string
    const date = new Date(pdf.date)
    
    const foundCompanies = []
    
    for (const c of empresas) {
      if (c.nombre.length < 4) continue;
      
      const searchStr = getSearchTokens(c.nombre)
      const regex = new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      let match;
      while ((match = regex.exec(text)) !== null) {
        foundCompanies.push({
          empresa: c,
          index: match.index
        })
      }
    }

    foundCompanies.sort((a, b) => a.index - b.index)

    const uniqueVisits = []
    let lastIndex = -1000
    for (const fc of foundCompanies) {
      if (fc.index - lastIndex > 50) {
        uniqueVisits.push(fc)
        lastIndex = fc.index
      }
    }

    for (let i = 0; i < uniqueVisits.length; i++) {
      const current = uniqueVisits[i]
      const nextIndex = i + 1 < uniqueVisits.length ? uniqueVisits[i+1].index : text.length

      const snippet = text.substring(current.index, nextIndex)
      
      let resultado = 'neutro'
      let resultadoLabel = 'Contacto Comercial'
      const lowerSnippet = snippet.toLowerCase()
      if (lowerSnippet.includes('contacto positivo') || lowerSnippet.includes('venta') || lowerSnippet.includes('oportunidad generada') || lowerSnippet.includes('cierre')) {
        resultado = 'venta'
        resultadoLabel = 'Contacto Positivo'
      } else if (lowerSnippet.includes('rechazo') || lowerSnippet.includes('descartado') || lowerSnippet.includes('negativo') || lowerSnippet.includes('rebotar')) {
        resultado = 'negativo'
        resultadoLabel = 'Rechazo'
      } else if (lowerSnippet.includes('muestra dejada') || lowerSnippet.includes('correo enviado') || lowerSnippet.includes('whatsapp') || lowerSnippet.includes('seguimiento') || lowerSnippet.includes('contacto obtenido')) {
        resultado = 'muestra_dejada'
        resultadoLabel = 'Seguimiento'
      } else if (lowerSnippet.includes('reprogram')) {
        resultado = 'reprogramado'
        resultadoLabel = 'Reprogramado'
      }

      let notas = snippet
        .replace(new RegExp(getSearchTokens(current.empresa.nombre), 'gi'), '')
        .replace(/Resultado:/gi, '')
        .replace(/Dirección:.*/gi, '')
        .replace(/Tel:.*/gi, '')
        .replace(/Canal:.*/gi, '')
        .replace(/\n+/g, ' ')
        .trim()
        
      if (notas.length > 500) notas = notas.substring(0, 500) + '...'
      if (notas.length < 5) notas = "Visita registrada en reporte PDF."

      console.log(` - Registrando visita para: ${current.empresa.nombre} (${pdf.filename})`)
      await prisma.visita.create({
        data: {
          empresaId: current.empresa.id,
          fecha: date,
          resultado,
          notas,
          contacto: ''
        }
      })
      
      await prisma.accion.create({
        data: {
          empresaId: current.empresa.id,
          tipo: 'visita_programada',
          descripcion: `${resultadoLabel} (Reporte ${pdf.filename})`,
          estado: 'completada',
          fechaVencimiento: date,
          completadaEn: date
        }
      })
      
      totalVisitas++
    }
  }

  console.log(`Importación finalizada. Se crearon ${totalVisitas} visitas.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
