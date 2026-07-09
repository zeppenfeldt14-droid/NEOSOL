import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const reportsDir = 'D:\\Reporte de Visitas\\Reportes de visitas'
    
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ reportes: [] })
    }

    const files = fs.readdirSync(reportsDir)
    
    const reportes = files.filter(f => f.endsWith('.pdf') || f.endsWith('.png')).map(filename => {
      const filePath = path.join(reportsDir, filename)
      const stats = fs.statSync(filePath)
      
      const namePart = filename.replace(/\.(pdf|png)$/, '')
      const parts = namePart.split('-')
      let date = stats.mtime
      if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`)
      }

      return {
        filename,
        size: stats.size,
        date: date.toISOString(),
        isImage: filename.endsWith('.png')
      }
    })

    reportes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ reportes })
  } catch (error) {
    console.error('Error listing reports:', error)
    return NextResponse.json({ error: 'Error al listar reportes' }, { status: 500 })
  }
}
