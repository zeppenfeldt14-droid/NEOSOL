import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import * as pdfImport from 'pdf-parse'
const pdf = (pdfImport as any).default || pdfImport


const prisma = new PrismaClient()

async function main() {
  console.log("Fetching CSV data...")
  const csvUrl = 'https://docs.google.com/spreadsheets/d/1prykfO8GGBZFARxiypBeNOhFAh1qO8BYlOm-CghjBk0/export?format=csv'
  const response = await fetch(csvUrl)
  const csvText = await response.text()
  
  const records = parse(csvText, {
    columns: false,
    skip_empty_lines: true
  })
  
  const companies = []
  for (let i = 1; i < records.length; i++) {
    const row = records[i]
    if (!row[2] || row[2].trim() === '') continue
    
    companies.push({
      zona: row[1]?.trim() || '',
      nombre: row[2]?.trim(),
      direccion: row[3]?.trim() || '',
      barrio: row[4]?.trim() || '',
      telefono: row[5]?.trim() || '',
      email: row[6]?.trim() || '',
      url: row[7]?.trim() || '',
      googleMaps: row[8]?.trim() || '',
      responsable: row[9]?.trim() || '',
      notas: row[10]?.trim() || ''
    })
  }
  
  console.log(`Found ${companies.length} companies in CSV.`)
  
  // Create or Update Companies
  const dbCompanies = []
  for (const c of companies) {
    let emp = await prisma.empresa.findFirst({
      where: { nombre: c.nombre }
    })
    
    const data = {
      nombre: c.nombre,
      direccion: c.direccion,
      telefono: c.telefono,
      email: c.email,
      zona: c.zona,
      estado: 'Activo',
      notas: c.notas
    }
    
    if (emp) {
      emp = await prisma.empresa.update({
        where: { id: emp.id },
        data: data
      })
    } else {
      emp = await prisma.empresa.create({
        data: data
      })
    }
    dbCompanies.push({ ...c, id: emp.id })
  }
  console.log("Empresas actualizadas.")
  
  // Read PDF reports to extract dates
  const reportsDir = 'D:\\Reporte de Visitas\\Reportes de visitas'
  const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.pdf'))
  
  console.log(`Analyzing ${files.length} PDF reports...`)
  
  const companyDates = new Map<string, string[]>()
  
  for (const file of files) {
    const namePart = file.replace('.pdf', '') // e.g., 05-06-2026
    const parts = namePart.split('-')
    if (parts.length === 3) {
      const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`
      const filePath = path.join(reportsDir, file)
      const dataBuffer = fs.readFileSync(filePath)
      let pdfData;
      try {
        pdfData = await pdf(dataBuffer)
      } catch(e) {
        console.error(`Could not parse ${file}`)
        continue
      }
      const text = pdfData.text
      
      for (const c of dbCompanies) {
        if (text.toLowerCase().includes(c.nombre.toLowerCase())) {
          if (!companyDates.has(c.nombre)) {
            companyDates.set(c.nombre, [])
          }
          companyDates.get(c.nombre)!.push(dateStr)
        }
      }
    }
  }
  
  // Now create actions
  for (const c of dbCompanies) {
    if (!c.notas) continue; 
    
    const dates = companyDates.get(c.nombre) || []
    
    if (dates.length > 0) {
      dates.sort()
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i]
        const isLast = (i === dates.length - 1)
        
        await prisma.accion.create({
          data: {
            empresaId: c.id,
            tipo: 'visita_programada',
            descripcion: dates.length > 1 ? (isLast ? c.notas || 'Visita de seguimiento / Cierre' : `Visita de contacto #${i+1}`) : (c.notas || 'Visita Comercial'),
            estado: 'completada',
            fechaVencimiento: new Date(d),
            completadaEn: new Date(d)
          }
        })
      }
    } else {
      await prisma.accion.create({
        data: {
          empresaId: c.id,
          tipo: 'visita_programada',
          descripcion: c.notas || 'Visita inicial',
          estado: 'completada',
          fechaVencimiento: new Date('2026-06-05T12:00:00Z'),
          completadaEn: new Date('2026-06-05T12:00:00Z')
        }
      })
    }
  }
  
  console.log("Importación finalizada con éxito.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
