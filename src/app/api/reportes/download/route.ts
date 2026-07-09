import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const filename = searchParams.get('file')

  if (!filename || (!filename.endsWith('.pdf') && !filename.endsWith('.png')) || filename.includes('..')) {
    return new NextResponse('Invalid file', { status: 400 })
  }

  const filePath = path.join('D:\\Reporte de Visitas\\Reportes de visitas', filename)

  if (!fs.existsSync(filePath)) {
    return new NextResponse('File not found', { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  
  const headers = new Headers()
  headers.set('Content-Type', filename.endsWith('.png') ? 'image/png' : 'application/pdf')
  headers.set('Content-Disposition', `inline; filename="${filename}"`)

  return new NextResponse(fileBuffer, { headers })
}
